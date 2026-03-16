/**
 * QR Code encoder — minimal implementation
 * Supports byte mode, error correction level M, versions 1-10
 *
 * Based on ISO/IEC 18004 standard
 */

// Error correction level M capacity (data codewords per version)
const DATA_CODEWORDS: number[] = [
  0,  // version 0 (unused)
  16, // version 1
  28, // version 2
  44, // version 3
  64, // version 4
  86, // version 5
  108, // version 6
  124, // version 7
  154, // version 8
  182, // version 9
  216, // version 10
]

// EC codewords per block for level M
const EC_CODEWORDS_PER_BLOCK: number[] = [
  0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26,
]

// Number of blocks for level M
const NUM_BLOCKS: number[][] = [
  [], // 0
  [1], // 1: 1 block
  [1], // 2
  [1], // 3
  [2], // 4: 2 blocks
  [2], // 5
  [4], // 6
  [4], // 7
  [2, 2], // 8: 2+2 blocks (different sizes)
  [3, 2], // 9
  [4, 1], // 10
]

const ALIGNMENT_PATTERNS: number[][] = [
  [], // 1
  [6, 18], // 2
  [6, 22], // 3
  [6, 26], // 4
  [6, 30], // 5
  [6, 34], // 6
  [6, 22, 38], // 7
  [6, 24, 42], // 8
  [6, 26, 46], // 9
  [6, 28, 50], // 10
]

/**
 * Encode text as QR code
 * Returns a 2D boolean array (true = dark module)
 */
export function encodeQR(text: string): boolean[][] {
  const data = new TextEncoder().encode(text)
  const version = selectVersion(data.length)
  const size = version * 4 + 17

  // Create data bitstream
  const bits = createDataBits(data, version)

  // Create matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  )

  // Place function patterns
  placeFinder(matrix, 0, 0)
  placeFinder(matrix, size - 7, 0)
  placeFinder(matrix, 0, size - 7)
  placeTiming(matrix, size)
  placeAlignmentPatterns(matrix, version)
  placeDarkModule(matrix, version)

  // Reserve format info areas
  reserveFormatInfo(matrix, size)

  if (version >= 7) {
    reserveVersionInfo(matrix, size)
  }

  // Place data
  placeData(matrix, bits, size)

  // Apply best mask
  const bestMask = selectBestMask(matrix, size, version)
  applyMask(matrix, bestMask, size)

  // Write format info
  writeFormatInfo(matrix, bestMask, size)

  // Convert null to false
  return matrix.map(row => row.map(cell => cell === true))
}

function selectVersion(dataLength: number): number {
  // Byte mode: 4 bit mode indicator + char count bits + data
  for (let v = 1; v <= 10; v++) {
    const charCountBits = v <= 9 ? 8 : 16
    const totalBits = 4 + charCountBits + dataLength * 8
    const capacity = DATA_CODEWORDS[v]! * 8
    if (totalBits <= capacity) return v
  }
  throw new Error('Text too long for QR code (max version 10)')
}

function createDataBits(data: Uint8Array, version: number): number[] {
  const bits: number[] = []
  const charCountBits = version <= 9 ? 8 : 16

  // Mode indicator: byte mode = 0100
  pushBits(bits, 4, 4)

  // Character count
  pushBits(bits, data.length, charCountBits)

  // Data
  for (const byte of data) {
    pushBits(bits, byte, 8)
  }

  // Terminator
  const totalDataBits = DATA_CODEWORDS[version]! * 8
  const terminatorLen = Math.min(4, totalDataBits - bits.length)
  pushBits(bits, 0, terminatorLen)

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  // Pad to capacity
  let padToggle = true
  while (bits.length < totalDataBits) {
    pushBits(bits, padToggle ? 236 : 17, 8)
    padToggle = !padToggle
  }

  // Add error correction
  return addErrorCorrection(bits, version)
}

function pushBits(arr: number[], value: number, count: number): void {
  for (let i = count - 1; i >= 0; i--) {
    arr.push((value >> i) & 1)
  }
}

// GF(256) arithmetic for Reed-Solomon
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)

// Initialize GF tables
;(function initGF() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x = x << 1
    if (x >= 256) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!
  }
})()

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 255]!
}

function generateECCodewords(data: number[], ecCount: number): number[] {
  // Generator polynomial coefficients
  const gen: number[] = [1]
  for (let i = 0; i < ecCount; i++) {
    const newGen = new Array(gen.length + 1).fill(0)
    for (let j = 0; j < gen.length; j++) {
      newGen[j] ^= gen[j]!
      newGen[j + 1] ^= gfMultiply(gen[j]!, GF_EXP[i]!)
    }
    gen.length = 0
    gen.push(...newGen)
  }

  // Divide
  const result = new Array(ecCount).fill(0)
  for (const byte of data) {
    const lead = byte ^ result[0]!
    result.shift()
    result.push(0)
    for (let j = 0; j < ecCount; j++) {
      result[j] ^= gfMultiply(lead, gen[j + 1]!)
    }
  }

  return result
}

function addErrorCorrection(bits: number[], version: number): number[] {
  // Convert bits to bytes
  const dataBytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j]!
    }
    dataBytes.push(byte)
  }

  const ecPerBlock = EC_CODEWORDS_PER_BLOCK[version]!
  const blockCounts = NUM_BLOCKS[version]!
  const totalBlocks = blockCounts.reduce((s, n) => s + n, 0)
  const totalDataCW = DATA_CODEWORDS[version]!

  // Split into blocks
  const blocks: number[][] = []
  const ecBlocks: number[][] = []
  let pos = 0
  let blockIdx = 0

  for (let g = 0; g < blockCounts.length; g++) {
    const count = blockCounts[g]!
    const cwPerBlock = Math.floor(totalDataCW / totalBlocks) + (g > 0 ? 1 : 0)
    for (let b = 0; b < count; b++) {
      const block = dataBytes.slice(pos, pos + cwPerBlock)
      blocks.push(block)
      ecBlocks.push(generateECCodewords(block, ecPerBlock))
      pos += cwPerBlock
      blockIdx++
    }
  }

  // Interleave data
  const result: number[] = []
  const maxDataLen = Math.max(...blocks.map(b => b.length))
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]!)
    }
  }

  // Interleave EC
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) result.push(ec[i]!)
    }
  }

  // Convert back to bits
  const finalBits: number[] = []
  for (const byte of result) {
    pushBits(finalBits, byte, 8)
  }

  return finalBits
}

function placeFinder(matrix: (boolean | null)[][], row: number, col: number): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
      matrix[row + r]![col + c] = isOuter || isInner
    }
  }
  // Separator
  for (let i = 0; i < 8; i++) {
    if (row + 7 < matrix.length) setSafe(matrix, row + 7, col + i, false)
    if (col + 7 < matrix[0]!.length) setSafe(matrix, row + i, col + 7, false)
    if (row - 1 >= 0) setSafe(matrix, row - 1, col + i, false)
    if (col - 1 >= 0) setSafe(matrix, row + i, col - 1, false)
  }
  // Corners
  setSafe(matrix, row + 7, col + 7, false)
  setSafe(matrix, row - 1, col - 1, false)
  setSafe(matrix, row + 7, col - 1, false)
  setSafe(matrix, row - 1, col + 7, false)
}

function setSafe(matrix: (boolean | null)[][], r: number, c: number, val: boolean): void {
  if (r >= 0 && r < matrix.length && c >= 0 && c < matrix[0]!.length) {
    matrix[r]![c] = val
  }
}

function placeTiming(matrix: (boolean | null)[][], size: number): void {
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6]![i] === null) matrix[6]![i] = i % 2 === 0
    if (matrix[i]![6] === null) matrix[i]![6] = i % 2 === 0
  }
}

function placeAlignmentPatterns(matrix: (boolean | null)[][], version: number): void {
  if (version < 2) return
  const positions = ALIGNMENT_PATTERNS[version - 1]!
  for (const row of positions) {
    for (const col of positions) {
      if (matrix[row]![col] !== null) continue
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2
          const isCenter = r === 0 && c === 0
          matrix[row + r]![col + c] = isOuter || isCenter
        }
      }
    }
  }
}

function placeDarkModule(matrix: (boolean | null)[][], version: number): void {
  matrix[4 * version + 9]![8] = true
}

function reserveFormatInfo(matrix: (boolean | null)[][], size: number): void {
  for (let i = 0; i < 8; i++) {
    if (matrix[8]![i] === null) matrix[8]![i] = false
    if (matrix[i]![8] === null) matrix[i]![8] = false
  }
  if (matrix[8]![7] === null) matrix[8]![7] = false
  if (matrix[8]![8] === null) matrix[8]![8] = false
  if (matrix[7]![8] === null) matrix[7]![8] = false

  for (let i = 0; i < 8; i++) {
    if (matrix[size - 1 - i]![8] === null) matrix[size - 1 - i]![8] = false
    if (matrix[8]![size - 1 - i] === null) matrix[8]![size - 1 - i] = false
  }
}

function reserveVersionInfo(_matrix: (boolean | null)[][], _size: number): void {
  // Version info for versions 7+ (simplified)
}

function placeData(matrix: (boolean | null)[][], bits: number[], size: number): void {
  let bitIdx = 0
  let upward = true

  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5 // Skip timing column

    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i)

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (matrix[row]![c] === null) {
          matrix[row]![c] = bitIdx < bits.length ? bits[bitIdx]! === 1 : false
          bitIdx++
        }
      }
    }

    upward = !upward
  }
}

function selectBestMask(matrix: (boolean | null)[][], size: number, _version: number): number {
  let bestMask = 0
  let bestScore = Infinity

  for (let mask = 0; mask < 8; mask++) {
    const copy = matrix.map(row => [...row])
    applyMask(copy, mask, size)
    const score = evaluateMask(copy, size)
    if (score < bestScore) {
      bestScore = score
      bestMask = mask
    }
  }

  return bestMask
}

function getMaskFn(mask: number): (r: number, c: number) => boolean {
  switch (mask) {
    case 0: return (r, c) => (r + c) % 2 === 0
    case 1: return (r) => r % 2 === 0
    case 2: return (_, c) => c % 3 === 0
    case 3: return (r, c) => (r + c) % 3 === 0
    case 4: return (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
    case 5: return (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0
    case 6: return (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0
    case 7: return (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
    default: return () => false
  }
}

function applyMask(matrix: (boolean | null)[][], mask: number, size: number): void {
  const fn = getMaskFn(mask)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Only mask data modules (not function patterns)
      if (isDataModule(matrix, r, c, size)) {
        if (fn(r, c)) {
          matrix[r]![c] = !matrix[r]![c]
        }
      }
    }
  }
}

function isDataModule(_matrix: (boolean | null)[][], r: number, c: number, size: number): boolean {
  // Finder + separator
  if (r < 9 && c < 9) return false
  if (r < 9 && c >= size - 8) return false
  if (r >= size - 8 && c < 9) return false
  // Timing
  if (r === 6 || c === 6) return false
  return true
}

function evaluateMask(matrix: (boolean | null)[][], size: number): number {
  let score = 0

  // Rule 1: consecutive same-color modules in row/column
  for (let r = 0; r < size; r++) {
    let count = 1
    for (let c = 1; c < size; c++) {
      if (matrix[r]![c] === matrix[r]![c - 1]) {
        count++
        if (count === 5) score += 3
        else if (count > 5) score++
      } else {
        count = 1
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let count = 1
    for (let r = 1; r < size; r++) {
      if (matrix[r]![c] === matrix[r - 1]![c]) {
        count++
        if (count === 5) score += 3
        else if (count > 5) score++
      } else {
        count = 1
      }
    }
  }

  // Rule 4: proportion of dark modules
  let dark = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r]![c]) dark++
    }
  }
  const percent = (dark * 100) / (size * size)
  const prev5 = Math.floor(percent / 5) * 5
  const next5 = prev5 + 5
  score += Math.min(Math.abs(prev5 - 50) / 5, Math.abs(next5 - 50) / 5) * 10

  return score
}

// Format info for error correction level M
const FORMAT_INFO_STRINGS: number[] = [
  0x5412, 0x5125, 0x5E7C, 0x5B4B,
  0x45F9, 0x40CE, 0x4F97, 0x4AA0,
]

function writeFormatInfo(matrix: (boolean | null)[][], mask: number, size: number): void {
  const formatInfo = FORMAT_INFO_STRINGS[mask]!

  // Around top-left finder
  for (let i = 0; i < 6; i++) {
    matrix[8]![i] = ((formatInfo >> (14 - i)) & 1) === 1
  }
  matrix[8]![7] = ((formatInfo >> 8) & 1) === 1
  matrix[8]![8] = ((formatInfo >> 7) & 1) === 1
  matrix[7]![8] = ((formatInfo >> 6) & 1) === 1
  for (let i = 0; i < 6; i++) {
    matrix[5 - i]![8] = ((formatInfo >> (i)) & 1) === 1
  }

  // Bottom-left and top-right
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i]![8] = ((formatInfo >> (14 - i)) & 1) === 1
  }
  for (let i = 0; i < 8; i++) {
    matrix[8]![size - 8 + i] = ((formatInfo >> (7 - i)) & 1) === 1
  }
}
