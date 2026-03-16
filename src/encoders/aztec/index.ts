/**
 * Aztec Code encoder
 *
 * Produces a 2D boolean matrix for compact (1-4 layers) and
 * full-range (1-32 layers) Aztec Code symbols per ISO/IEC 24778.
 *
 * Features:
 * - 5 text encoding modes (Upper, Lower, Mixed, Punctuation, Digit) + Binary Shift
 * - Reed-Solomon error correction with variable GF sizes
 * - Bullseye finder pattern at center (no quiet zone required)
 * - Compact mode (15x15 to 27x27) and full-range mode (19x19 to 143x143)
 */

import { CapacityError, InvalidInputError } from "../../errors";
import { getWordSize, getModuleCount, getTotalBitCapacity } from "./tables";
import { encodeHighLevel, bitsToCodewords, stuffBits, padBits } from "./encoder";
import { rsEncode, encodeCompactModeMessage, encodeFullModeMessage } from "./reed-solomon";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AztecOptions {
  /** Error correction percentage (default 23, meaning 23%) */
  ecPercent?: number;
  /** Force a specific number of layers (1-4 compact, 1-32 full) */
  layers?: number;
  /** Force compact mode (true) or full-range mode (false) */
  compact?: boolean;
}

/**
 * Encode text as an Aztec Code matrix.
 *
 * @param text - The text to encode (ASCII/Latin-1)
 * @param options - Encoding options
 * @returns 2D boolean array where `true` = dark module
 */
export function encodeAztec(text: string, options: AztecOptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("Aztec Code: input text must not be empty");
  }

  const ecPercent = options.ecPercent ?? 23;

  // Step 1: Encode text into a bit stream
  const dataBits = encodeHighLevel(text);

  // Step 2: Select symbol size
  const { layers, compact } = selectSize(dataBits.length, ecPercent, options);

  const wordSize = getWordSize(layers, compact);
  const totalBitCapacity = getTotalBitCapacity(layers, compact);
  const totalCodewords = Math.floor(totalBitCapacity / wordSize);

  // Step 3: Compute EC codeword count
  const ecCodewords = computeECCount(totalCodewords, dataBits.length, wordSize, ecPercent);
  const dataCodewords = totalCodewords - ecCodewords;

  // Step 4: Stuff bits and convert to codewords
  const stuffed = stuffBits(dataBits, wordSize);
  const padded = padBits(stuffed, dataCodewords * wordSize, wordSize);
  const dataCW = bitsToCodewords(padded, wordSize);

  // Step 5: Generate Reed-Solomon EC codewords
  const ecCW = rsEncode(dataCW, ecCodewords, wordSize);

  // Step 6: Combine data + EC and convert to bits for placement
  const allCW = [...dataCW, ...ecCW];
  const allBits: number[] = [];
  for (const cw of allCW) {
    for (let b = wordSize - 1; b >= 0; b--) {
      allBits.push((cw >> b) & 1);
    }
  }

  // Step 7: Build the mode message
  const modeMsg = compact
    ? encodeCompactModeMessage(layers, dataCodewords)
    : encodeFullModeMessage(layers, dataCodewords);

  // Step 8: Build the matrix
  const moduleCount = getModuleCount(layers, compact);
  const matrix = createCellMatrix(moduleCount);

  // Place bullseye finder pattern at center
  placeBullseye(matrix, compact);

  // Place orientation marks on the outermost ring of the core
  placeOrientation(matrix, compact);

  // Place reference grid (full-range only — must be before data placement)
  if (!compact) {
    placeReferenceGrid(matrix, moduleCount);
  }

  // Place mode message around the bullseye
  placeModeMessage(matrix, modeMsg, compact);

  // Place data bits in layers
  placeDataLayers(matrix, allBits, layers, compact);

  // Convert Cell[][] to boolean[][]
  return matrix.map((row) => row.map((cell) => cell === 1));
}

// ---------------------------------------------------------------------------
// Size selection
// ---------------------------------------------------------------------------

/**
 * Select the smallest symbol that fits the data with the requested EC level.
 */
function selectSize(
  dataBitCount: number,
  ecPercent: number,
  options: AztecOptions,
): { layers: number; compact: boolean } {
  // If layers/compact are forced, validate and return
  if (options.layers !== undefined) {
    const compact = options.compact ?? options.layers <= 4;
    const wordSize = getWordSize(options.layers, compact);
    const totalBits = getTotalBitCapacity(options.layers, compact);
    const totalCW = Math.floor(totalBits / wordSize);
    const ecCW = computeECCount(totalCW, dataBitCount, wordSize, ecPercent);
    const dataCW = totalCW - ecCW;
    if (dataCW * wordSize < dataBitCount) {
      throw new CapacityError(
        `Aztec Code: data (${dataBitCount} bits) exceeds capacity of ` +
          `${compact ? "compact" : "full"} ${options.layers}-layer symbol`,
      );
    }
    return { layers: options.layers, compact };
  }

  // Try compact first (layers 1-4)
  if (options.compact !== false) {
    for (let layers = 1; layers <= 4; layers++) {
      if (canFit(dataBitCount, layers, true, ecPercent)) {
        return { layers, compact: true };
      }
    }
  }

  // Try full-range (layers 1-32)
  if (options.compact !== true) {
    for (let layers = 1; layers <= 32; layers++) {
      if (canFit(dataBitCount, layers, false, ecPercent)) {
        return { layers, compact: false };
      }
    }
  }

  throw new CapacityError(`Aztec Code: data (${dataBitCount} bits) exceeds maximum capacity`);
}

/** Check whether data fits in a given symbol configuration */
function canFit(
  dataBitCount: number,
  layers: number,
  compact: boolean,
  ecPercent: number,
): boolean {
  const wordSize = getWordSize(layers, compact);
  const totalBits = getTotalBitCapacity(layers, compact);
  const totalCW = Math.floor(totalBits / wordSize);
  const ecCW = computeECCount(totalCW, dataBitCount, wordSize, ecPercent);
  const dataCW = totalCW - ecCW;
  return dataCW * wordSize >= dataBitCount;
}

/** Compute the number of EC codewords for a given configuration */
function computeECCount(
  totalCodewords: number,
  dataBitCount: number,
  wordSize: number,
  ecPercent: number,
): number {
  const dataCodewordsNeeded = Math.ceil(dataBitCount / wordSize);
  const ecFromCapacity = totalCodewords - dataCodewordsNeeded;
  const minEC = Math.ceil((totalCodewords * ecPercent) / 100);
  // Use whichever is larger: the EC from remaining capacity or the minimum EC %
  const ec = Math.max(minEC, Math.min(ecFromCapacity, totalCodewords - 1));
  // Reed-Solomon needs at least 1 EC codeword to be meaningful
  return Math.max(ec, Math.min(3, totalCodewords - 1));
}

// ---------------------------------------------------------------------------
// Matrix cell type and construction
// ---------------------------------------------------------------------------

/**
 * Cell states:
 *  -1 = unset (available for data)
 *   0 = light (function pattern)
 *   1 = dark  (function pattern)
 */
type Cell = -1 | 0 | 1;

/** Create an empty matrix filled with -1 (unset) */
function createCellMatrix(size: number): Cell[][] {
  return Array.from({ length: size }, () => Array.from<Cell>({ length: size }).fill(-1));
}

// ---------------------------------------------------------------------------
// Bullseye finder pattern
// ---------------------------------------------------------------------------

/**
 * Place the concentric-square bullseye at the center of the matrix.
 *
 * The bullseye alternates dark/light from the center outward:
 *   distance 0 (center): dark
 *   distance 1:          light  (3x3 border)
 *   distance 2:          dark   (5x5 border)
 *   distance 3:          light  (7x7 border)
 *   distance 4:          dark   (9x9 border)
 *   (full only:)
 *   distance 5:          light  (11x11 border)
 *   distance 6:          dark   (13x13 border)
 *
 * Compact: 9x9 bullseye (distances 0-4), core = 11x11
 * Full:    13x13 bullseye (distances 0-6), core = 15x15
 */
function placeBullseye(matrix: Cell[][], compact: boolean): void {
  const size = matrix.length;
  const center = Math.floor(size / 2);
  // The bullseye rings go out to distance 4 (compact) or 6 (full)
  const maxDist = compact ? 4 : 6;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const dist = Math.max(Math.abs(r - center), Math.abs(c - center));
      if (dist <= maxDist) {
        matrix[r]![c] = dist % 2 === 0 ? 1 : 0;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Orientation marks
// ---------------------------------------------------------------------------

/**
 * Place orientation marks on the outermost ring of the core area.
 *
 * The core has one ring beyond the bullseye that carries orientation info:
 *   Compact: distance 5 from center (ring of 11x11)
 *   Full:    distance 7 from center (ring of 15x15)
 *
 * The orientation ring is drawn as follows (looking at a standard-orientation symbol):
 *   - Top side:    solid dark modules from left corner to right corner
 *   - Right side:  solid dark modules from top corner to bottom corner
 *   - Bottom side: alternating, starting dark from right-to-left, with
 *                  bottom-left corner = 0 (light)
 *   - Left side:   alternating, starting dark from bottom-to-top, with
 *                  top-left corner already dark from top side
 *
 * This creates an asymmetric pattern so scanners can determine orientation:
 *   - Top-left corner:     dark
 *   - Top-right corner:    dark
 *   - Bottom-right corner: dark
 *   - Bottom-left corner:  light
 */
function placeOrientation(matrix: Cell[][], compact: boolean): void {
  const size = matrix.length;
  const center = Math.floor(size / 2);
  const d = compact ? 5 : 7; // distance of orientation ring

  const top = center - d;
  const bottom = center + d;
  const left = center - d;
  const right = center + d;

  // Top side: all dark
  for (let c = left; c <= right; c++) {
    matrix[top]![c] = 1;
  }

  // Right side: all dark
  for (let r = top; r <= bottom; r++) {
    matrix[r]![right] = 1;
  }

  // Bottom side: alternating, right to left
  // Start with dark at bottom-right (already set by right side), alternate from there
  for (let c = right; c >= left; c--) {
    matrix[bottom]![c] = (right - c) % 2 === 0 ? 1 : 0;
  }

  // Left side: alternating, bottom to top
  // bottom-left = 0 (from bottom side), then alternate upward
  for (let r = bottom; r >= top; r--) {
    matrix[r]![left] = (bottom - r) % 2 === 0 ? 1 : 0;
  }

  // Fix corners that may have been overwritten:
  // Top-left: dark (top side takes priority)
  matrix[top]![left] = 1;
  // Top-right: dark (both top and right sides agree)
  matrix[top]![right] = 1;
  // Bottom-right: dark (both right and bottom sides agree)
  matrix[bottom]![right] = 1;
  // Bottom-left: light (orientation indicator)
  matrix[bottom]![left] = 0;
}

// ---------------------------------------------------------------------------
// Mode message placement
// ---------------------------------------------------------------------------

/**
 * Place mode message bits around the bullseye, between the bullseye
 * and the orientation ring.
 *
 * For compact (28 bits): placed on the ring at distance 5 from center,
 *   on the INNER side of the orientation ring.
 *   7 bits per side, clockwise from upper-left:
 *     Top:    left to right
 *     Right:  top to bottom
 *     Bottom: right to left
 *     Left:   bottom to top
 *
 * For full-range (40 bits): placed at distance 7 from center,
 *   10 bits per side.
 *
 * The mode message positions interleave with the orientation ring.
 * Per the spec, the mode message bits sit on specific modules around
 * the boundary between the bullseye and the orientation ring.
 *
 * Specifically, for compact Aztec the 28 mode message bits are placed
 * on two rings: the modules just inside the orientation marks.
 * The positions go around the core clockwise.
 */
function placeModeMessage(matrix: Cell[][], bits: number[], compact: boolean): void {
  const size = matrix.length;
  const center = Math.floor(size / 2);
  const d = compact ? 5 : 7;

  // The mode message is placed on the orientation ring itself,
  // on the non-corner modules (the corners are reserved for orientation marks).
  // Actually, per the spec the mode message goes on modules at specific
  // positions around the core. For compact, it's on 7 modules per side.

  // We place the mode message on the same ring as the orientation marks,
  // replacing the inner (non-corner, non-orientation-critical) modules.

  // Actually, let me use a cleaner approach: place mode message bits on
  // a dedicated ring just inside the orientation ring (at distance d-1).
  // This is at the outer edge of the bullseye pattern.

  // Per ISO 24778, the mode message for compact is 28 bits placed around
  // the core. The bits are placed clockwise starting from the top-left,
  // going along the top side, then right, then bottom (right to left),
  // then left (bottom to top).

  // For compact: 7 bits per side, placed at the orientation ring position.
  // The orientation ring occupies distance d from center.
  // The mode message replaces certain modules on that ring.

  // The mode message bits are placed on the sides of the orientation ring,
  // EXCLUDING the corners. Each side has (2*d - 1) modules; corners are
  // orientation marks, leaving (2*d - 1 - 2) = (2*d - 3) inner modules
  // per side.

  // For compact d=5: 2*5 - 1 = 9 modules per side of ring, minus 2 corners = 7. Correct!
  // For full d=7: 2*7 - 1 = 13 modules per side of ring, minus 2 corners = 11.
  //   But full mode message is 40 bits / 4 sides = 10 per side, not 11.
  //   So full uses 10 of the 11 available modules per side.

  const bitsPerSide = compact ? 7 : 10;
  let bitIdx = 0;

  const top = center - d;
  const bottom = center + d;
  const left = center - d;
  const right = center + d;

  // Top side: left+1 to left+bitsPerSide (excludes left corner, goes right)
  for (let i = 0; i < bitsPerSide && bitIdx < bits.length; i++) {
    matrix[top]![left + 1 + i] = bits[bitIdx]! as Cell;
    bitIdx++;
  }

  // Right side: top+1 to top+bitsPerSide
  for (let i = 0; i < bitsPerSide && bitIdx < bits.length; i++) {
    matrix[top + 1 + i]![right] = bits[bitIdx]! as Cell;
    bitIdx++;
  }

  // Bottom side: right-1 to right-bitsPerSide (going left)
  for (let i = 0; i < bitsPerSide && bitIdx < bits.length; i++) {
    matrix[bottom]![right - 1 - i] = bits[bitIdx]! as Cell;
    bitIdx++;
  }

  // Left side: bottom-1 to bottom-bitsPerSide (going up)
  for (let i = 0; i < bitsPerSide && bitIdx < bits.length; i++) {
    matrix[bottom - 1 - i]![left] = bits[bitIdx]! as Cell;
    bitIdx++;
  }
}

// ---------------------------------------------------------------------------
// Reference grid (full-range only)
// ---------------------------------------------------------------------------

/**
 * Place reference grid lines for full-range Aztec symbols.
 *
 * Reference grid lines run every 16 modules from the center, spanning the
 * entire symbol width/height. Modules on grid lines alternate dark/light.
 * The center row and column ARE grid lines (at offset 0) but are already
 * occupied by the bullseye, so we only explicitly draw the lines at
 * offsets +/-16, +/-32, etc.
 *
 * Grid line modules only fill cells that are still unset (-1).
 */
function placeReferenceGrid(matrix: Cell[][], size: number): void {
  const center = Math.floor(size / 2);

  for (let offset = 16; center - offset >= 0 || center + offset < size; offset += 16) {
    for (const pos of [center - offset, center + offset]) {
      if (pos < 0 || pos >= size) continue;

      // Horizontal line at row = pos
      for (let c = 0; c < size; c++) {
        if (matrix[pos]![c] === -1) {
          matrix[pos]![c] = (c + pos) % 2 === 0 ? 1 : 0;
        }
      }

      // Vertical line at col = pos
      for (let r = 0; r < size; r++) {
        if (matrix[r]![pos] === -1) {
          matrix[r]![pos] = (r + pos) % 2 === 0 ? 1 : 0;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Data layer placement
// ---------------------------------------------------------------------------

/**
 * Place data bits into the layers around the core.
 *
 * Each data layer is a 2-module-wide ring outside the core/previous layer.
 * The core boundary is at distance 5 (compact) or 7 (full) from center,
 * so the first data layer occupies distances 6-7 (compact) or 8-9 (full).
 *
 * Within each layer, data modules are visited in clockwise order:
 *   Top side    -> Right side -> Bottom side -> Left side
 *
 * On each side, the two rows (or columns) of the layer are visited
 * together: for the top side we go left-to-right, reading the outer
 * row then inner row for each column position.
 *
 * Modules that are already occupied (by reference grid lines in full-range
 * symbols) are skipped — they don't carry data.
 */
function placeDataLayers(matrix: Cell[][], bits: number[], layers: number, compact: boolean): void {
  const size = matrix.length;
  const center = Math.floor(size / 2);
  const coreHalf = compact ? 5 : 7;

  let bitIdx = 0;

  for (let layer = 1; layer <= layers; layer++) {
    // Distances from center for this layer's two rings
    const innerDist = coreHalf + 2 * (layer - 1) + 1;
    const outerDist = innerDist + 1;

    const positions = collectLayerPositions(center, innerDist, outerDist, size, matrix);

    for (const [r, c] of positions) {
      if (bitIdx < bits.length) {
        matrix[r]![c] = bits[bitIdx]! as Cell;
      } else {
        matrix[r]![c] = 0; // fill remaining with light
      }
      bitIdx++;
    }
  }
}

/**
 * Collect data module positions for one layer in clockwise order.
 *
 * The layer is a 2-module-wide ring between innerDist and outerDist.
 * We visit modules on 4 sides: Top, Right, Bottom, Left.
 * On each side, for each position along the side, we read the outer
 * module first, then the inner module.
 *
 * Positions already occupied by function patterns (bullseye, orientation,
 * reference grid) are skipped.
 */
function collectLayerPositions(
  center: number,
  innerDist: number,
  outerDist: number,
  size: number,
  matrix: Cell[][],
): Array<[number, number]> {
  const positions: Array<[number, number]> = [];

  const outerTop = center - outerDist;
  const outerBottom = center + outerDist;
  const outerLeft = center - outerDist;
  const outerRight = center + outerDist;

  const innerTop = center - innerDist;
  const innerBottom = center + innerDist;
  const innerLeft = center - innerDist;
  const innerRight = center + innerDist;

  // Top side: columns left to right
  for (let c = outerLeft; c <= outerRight; c++) {
    addIfFree(positions, outerTop, c, size, matrix);
    addIfFree(positions, innerTop, c, size, matrix);
  }

  // Right side: rows top+1 to bottom-1 (skip corners already covered)
  for (let r = outerTop + 1; r <= outerBottom - 1; r++) {
    addIfFree(positions, r, outerRight, size, matrix);
    addIfFree(positions, r, innerRight, size, matrix);
  }

  // Bottom side: columns right to left
  for (let c = outerRight; c >= outerLeft; c--) {
    addIfFree(positions, outerBottom, c, size, matrix);
    addIfFree(positions, innerBottom, c, size, matrix);
  }

  // Left side: rows bottom-1 to top+1
  for (let r = outerBottom - 1; r >= outerTop + 1; r--) {
    addIfFree(positions, r, outerLeft, size, matrix);
    addIfFree(positions, r, innerLeft, size, matrix);
  }

  return positions;
}

/** Add a position if it is in bounds and not yet occupied */
function addIfFree(
  positions: Array<[number, number]>,
  r: number,
  c: number,
  size: number,
  matrix: Cell[][],
): void {
  if (r >= 0 && r < size && c >= 0 && c < size && matrix[r]![c] === -1) {
    positions.push([r, c]);
  }
}
