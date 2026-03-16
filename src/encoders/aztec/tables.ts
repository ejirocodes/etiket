/**
 * Aztec Code lookup tables
 * Based on ISO/IEC 24778:2008
 *
 * Defines encoding mode character maps, mode transition codes,
 * and symbol size/capacity tables for compact and full-range symbols.
 */

// ---------------------------------------------------------------------------
// Encoding modes
// ---------------------------------------------------------------------------

export const enum Mode {
  Upper = 0,
  Lower = 1,
  Mixed = 2,
  Punct = 3,
  Digit = 4,
}

/** Bits per codeword in each mode (Digit is 4-bit, all others are 5-bit) */
export const MODE_BITS: Record<Mode, number> = {
  [Mode.Upper]: 5,
  [Mode.Lower]: 5,
  [Mode.Mixed]: 5,
  [Mode.Punct]: 5,
  [Mode.Digit]: 4,
};

// ---------------------------------------------------------------------------
// Character-to-codeword value tables for each mode
// Values of -1 are unused / not representable in that mode.
//
// Each map returns { value, mode } where value is the codeword index within
// the given mode.  Characters not present in a mode's table simply cannot be
// encoded in that mode directly.
// ---------------------------------------------------------------------------

/**
 * Upper mode (5-bit codewords)
 * Codeword 1 = SP, 2-27 = A-Z
 * Codewords 0, 28-31 are control / switch codes
 */
// prettier-ignore
const UPPER_TABLE: Record<string, number> = {
  ' ': 1,
  'A': 2,  'B': 3,  'C': 4,  'D': 5,  'E': 6,  'F': 7,  'G': 8,
  'H': 9,  'I': 10, 'J': 11, 'K': 12, 'L': 13, 'M': 14, 'N': 15,
  'O': 16, 'P': 17, 'Q': 18, 'R': 19, 'S': 20, 'T': 21, 'U': 22,
  'V': 23, 'W': 24, 'X': 25, 'Y': 26, 'Z': 27,
}

/**
 * Lower mode (5-bit codewords)
 * Codeword 1 = SP, 2-27 = a-z
 */
// prettier-ignore
const LOWER_TABLE: Record<string, number> = {
  ' ': 1,
  'a': 2,  'b': 3,  'c': 4,  'd': 5,  'e': 6,  'f': 7,  'g': 8,
  'h': 9,  'i': 10, 'j': 11, 'k': 12, 'l': 13, 'm': 14, 'n': 15,
  'o': 16, 'p': 17, 'q': 18, 'r': 19, 's': 20, 't': 21, 'u': 22,
  'v': 23, 'w': 24, 'x': 25, 'y': 26, 'z': 27,
}

/**
 * Mixed mode (5-bit codewords)
 * Codeword 1 = ^A (ctrl-A) … 13 = ^M (CR), plus misc punctuation
 */
// prettier-ignore
const MIXED_TABLE: Record<string, number> = {
  '\x01': 1,  '\x02': 2,  '\x03': 3,  '\x04': 4,  '\x05': 5,
  '\x06': 6,  '\x07': 7,  '\x08': 8,  '\x09': 9,  '\x0a': 10,
  '\x0b': 11, '\x0c': 12, '\x0d': 13,
  '\x1b': 14, // ESC
  '\x1c': 15, '\x1d': 16, '\x1e': 17, '\x1f': 18,
  '@': 19,  '\\': 20,  '^': 21,  '_': 22,  '`': 23,  '|': 24,  '~': 25,
  '\x7f': 26, // DEL
}

/**
 * Punctuation mode (5-bit codewords)
 * Codeword 1 = CR, 2 = CR LF, 3 = ". ", 4 = ", ", 5 = ": ",
 * 6-30 = various punctuation characters
 */
// prettier-ignore
const PUNCT_TABLE: Record<string, number> = {
  '\r':  1,
  // Two-character sequences CR LF, ". ", ", ", ": " are handled specially
  '!':  6,  '"':  7,  '#':  8,  '$':  9,  '%': 10, '&': 11,
  '\'': 12, '(':  13, ')': 14, '*': 15, '+': 16, ',': 17,
  '-':  18, '.':  19, '/': 20, ':': 21, ';': 22, '<': 23,
  '=':  24, '>':  25, '?': 26, '[': 27, ']': 28, '{': 29,
  '}':  30,
}

/** Two-character punctuation sequences */
export const PUNCT_PAIRS: ReadonlyMap<string, number> = new Map([
  ["\r\n", 2],
  [". ", 3],
  [", ", 4],
  [": ", 5],
]);

/**
 * Digit mode (4-bit codewords)
 * Codeword 1 = SP, 2-11 = 0-9, 12 = ",", 13 = "."
 */
// prettier-ignore
const DIGIT_TABLE: Record<string, number> = {
  ' ': 1,
  '0': 2,  '1': 3,  '2': 4,  '3': 5,  '4': 6,
  '5': 7,  '6': 8,  '7': 9,  '8': 10, '9': 11,
  ',': 12, '.': 13,
}

/** Indexed character tables for quick lookup */
export const CHAR_TABLE: ReadonlyArray<Readonly<Record<string, number>>> = [
  UPPER_TABLE,
  LOWER_TABLE,
  MIXED_TABLE,
  PUNCT_TABLE,
  DIGIT_TABLE,
];

// ---------------------------------------------------------------------------
// Mode transition (latch & shift) codes
// ---------------------------------------------------------------------------

/**
 * Latch codes to switch permanently from one mode to another.
 * latchCode[from][to] = { code, bits }
 * A value of -1 means no direct latch exists; must go through an intermediate mode.
 *
 * From Upper (5-bit):  L=28  M=29  P=29,30(via M,P latch)  D=30  B/S=31
 * From Lower (5-bit):  U=28(shift) M=29  P=29,30(via M)  D=30  B/S=31
 * From Mixed (5-bit):  U=29  L=28  P=30  D=28,30(via L)  B/S=31
 * From Punct (5-bit):  U=31 (latch back to Upper)
 * From Digit (4-bit):  U=14  L=14,28(via U)  B/S=15
 */

export interface ModeSwitch {
  codes: number[];
  modes: Mode[];
  totalBits: number;
}

/**
 * Returns the sequence of latch/shift codes to transition from `from` to `to`.
 * Each step is a { code, bitsInCurrentMode } pair.
 */
export function getLatchSequence(from: Mode, to: Mode): ModeSwitch {
  if (from === to) return { codes: [], modes: [], totalBits: 0 };

  // Direct latches between modes
  // Upper -> Lower: 28 (5 bits)
  // Upper -> Mixed: 29 (5 bits)
  // Upper -> Digit: 30 (5 bits, actually Shift to Punct — we use a different path)
  // Upper -> Punct: via Mixed(29) then Punct latch (30) — 10 bits
  // Upper -> Digit: 30 (5 bits)

  switch (from) {
    case Mode.Upper:
      switch (to) {
        case Mode.Lower:
          return { codes: [28], modes: [Mode.Upper], totalBits: 5 };
        case Mode.Mixed:
          return { codes: [29], modes: [Mode.Upper], totalBits: 5 };
        case Mode.Punct:
          return { codes: [29, 30], modes: [Mode.Upper, Mode.Mixed], totalBits: 10 };
        case Mode.Digit:
          return { codes: [30], modes: [Mode.Upper], totalBits: 5 };
      }
      break;
    case Mode.Lower:
      switch (to) {
        case Mode.Upper:
          return { codes: [28, 28], modes: [Mode.Lower, Mode.Mixed], totalBits: 10 };
        case Mode.Mixed:
          return { codes: [28], modes: [Mode.Lower], totalBits: 5 };
        case Mode.Punct:
          return { codes: [28, 30], modes: [Mode.Lower, Mode.Mixed], totalBits: 10 };
        case Mode.Digit:
          return { codes: [29], modes: [Mode.Lower], totalBits: 5 };
      }
      break;
    case Mode.Mixed:
      switch (to) {
        case Mode.Upper:
          return { codes: [29], modes: [Mode.Mixed], totalBits: 5 };
        case Mode.Lower:
          return { codes: [28], modes: [Mode.Mixed], totalBits: 5 };
        case Mode.Punct:
          return { codes: [30], modes: [Mode.Mixed], totalBits: 5 };
        case Mode.Digit:
          return { codes: [28, 29], modes: [Mode.Mixed, Mode.Lower], totalBits: 10 };
      }
      break;
    case Mode.Punct:
      // Punct can only latch back to Upper (code 31)
      switch (to) {
        case Mode.Upper:
          return { codes: [31], modes: [Mode.Punct], totalBits: 5 };
        case Mode.Lower:
          return { codes: [31, 28], modes: [Mode.Punct, Mode.Upper], totalBits: 10 };
        case Mode.Mixed:
          return { codes: [31, 29], modes: [Mode.Punct, Mode.Upper], totalBits: 10 };
        case Mode.Digit:
          return { codes: [31, 30], modes: [Mode.Punct, Mode.Upper], totalBits: 10 };
      }
      break;
    case Mode.Digit:
      // Digit latch to Upper is code 14 (4 bits)
      switch (to) {
        case Mode.Upper:
          return { codes: [14], modes: [Mode.Digit], totalBits: 4 };
        case Mode.Lower:
          return { codes: [14, 28], modes: [Mode.Digit, Mode.Upper], totalBits: 9 };
        case Mode.Mixed:
          return { codes: [14, 29], modes: [Mode.Digit, Mode.Upper], totalBits: 9 };
        case Mode.Punct:
          return {
            codes: [14, 29, 30],
            modes: [Mode.Digit, Mode.Upper, Mode.Mixed],
            totalBits: 14,
          };
      }
      break;
  }

  // Should be unreachable
  return { codes: [], modes: [], totalBits: 0 };
}

/**
 * Shift codes — temporary switch for one character.
 * Only certain shifts are available:
 * - From any mode: Shift to Punct via special codes
 * - Upper -> BS (Binary Shift): code 31
 * - Lower -> Upper shift: code 28
 */

/** Shift to Punct: available from Upper (code 0), Lower (code 0), Mixed (code 0) — all use code 0 */
export const SHIFT_TO_PUNCT: Record<number, number> = {
  [Mode.Upper]: 0,
  [Mode.Lower]: 0,
  [Mode.Mixed]: 0,
};

/** Shift to Upper from Lower: code 28 */
export const SHIFT_LOWER_TO_UPPER = 28;

/** Binary shift code value (from Upper/Lower/Mixed: code 31, from Digit: code 15) */
export const BINARY_SHIFT: Record<number, { code: number; bits: number }> = {
  [Mode.Upper]: { code: 31, bits: 5 },
  [Mode.Lower]: { code: 31, bits: 5 },
  [Mode.Mixed]: { code: 31, bits: 5 },
  [Mode.Digit]: { code: 15, bits: 4 },
};

// ---------------------------------------------------------------------------
// Symbol size and capacity tables
// ---------------------------------------------------------------------------

export interface AztecSize {
  layers: number;
  compact: boolean;
  modules: number;
  /** Total data bits available in the data layers (before error correction) */
  totalBits: number;
  /** Codeword size in bits for this symbol */
  wordSize: number;
}

/**
 * Compute the codeword size for a given number of layers and compact flag.
 * Compact: layer 1 → 4-bit, layers 2-4 → 6-bit
 * Full:    layers 1-2 → 6-bit, layers 3-8 → 8-bit,
 *          layers 9-22 → 10-bit, layers 23-32 → 12-bit
 */
export function getWordSize(layers: number, compact: boolean): number {
  if (compact) {
    return layers === 1 ? 4 : 6;
  }
  if (layers <= 2) return 6;
  if (layers <= 8) return 8;
  if (layers <= 22) return 10;
  return 12;
}

// ---------------------------------------------------------------------------
// Symbol capacity tables
// ---------------------------------------------------------------------------

// prettier-ignore
/**
 * Compact Aztec: total bit capacity per layer count (data + EC combined).
 * Indexed by layers-1 (0 = layer 1, 3 = layer 4).
 * From ISO 24778 Table 2.
 */
export const COMPACT_TOTAL_BITS: readonly number[] = [
  88,   // L=1: 15x15
  168,  // L=2: 19x19
  288,  // L=3: 23x23
  440,  // L=4: 27x27
]

/**
 * Full-range Aztec: raw bit capacity per layer count (data + EC bits combined).
 * Layers 1-32. Indexed by layers-1.
 *
 * For full-range, the core is 15x15. Each layer i contributes modules,
 * but reference grid lines (every 16 rows/cols from center) consume some modules.
 *
 * The total codeword counts (data + EC) from the spec for each full-range layer:
 */
// prettier-ignore
export const FULL_TOTAL_BITS: readonly number[] = [
  128,   // L=1:  19x19
  288,   // L=2:  23x23
  480,   // L=3:  27x27
  704,   // L=4:  31x31
  960,   // L=5:  35x35
  1248,  // L=6:  39x39
  1568,  // L=7:  43x43
  1920,  // L=8:  47x47
  2304,  // L=9:  51x51
  2720,  // L=10: 55x55
  3168,  // L=11: 59x59
  3648,  // L=12: 63x63
  4160,  // L=13: 67x67
  4704,  // L=14: 71x71
  5280,  // L=15: 75x75
  5888,  // L=16: 79x79
  6528,  // L=17: 83x83
  7200,  // L=18: 87x87
  7904,  // L=19: 91x91
  8640,  // L=20: 95x95
  9408,  // L=21: 99x99
  10208, // L=22: 103x103
  11040, // L=23: 107x107
  11904, // L=24: 111x111
  12800, // L=25: 115x115
  13728, // L=26: 119x119
  14688, // L=27: 123x123
  15680, // L=28: 127x127
  16704, // L=29: 131x131
  17760, // L=30: 135x135
  18848, // L=31: 139x139
  19968, // L=32: 143x143
]

/**
 * Compute the number of modules on each side for a given configuration.
 */
export function getModuleCount(layers: number, compact: boolean): number {
  return compact ? 11 + 4 * layers : 15 + 4 * layers;
}

/**
 * Get the total bit capacity for a symbol configuration.
 */
export function getTotalBitCapacity(layers: number, compact: boolean): number {
  if (compact) {
    return COMPACT_TOTAL_BITS[layers - 1]!;
  }
  return FULL_TOTAL_BITS[layers - 1]!;
}

// ---------------------------------------------------------------------------
// GF primitive polynomials for Reed-Solomon
// ---------------------------------------------------------------------------

/** Primitive polynomials indexed by word size */
export const GF_POLY: Record<number, number> = {
  4: 0x13, // x^4 + x + 1
  6: 0x43, // x^6 + x + 1
  8: 0x12d, // x^8 + x^5 + x^3 + x^2 + 1
  10: 0x409, // x^10 + x^3 + 1
  12: 0x1069, // x^12 + x^6 + x^4 + x + 1
};

// ---------------------------------------------------------------------------
// Mode message parameters
// ---------------------------------------------------------------------------

/** Compact mode message: 28 bits total (2 bits layers + 6 bits data codewords + 5 EC bits encoded to 28 via RS) */
export const COMPACT_MODE_MSG_BITS = 28;

/** Full-range mode message: 40 bits total (5 bits layers + 11 bits data codewords + EC encoded to 40) */
export const FULL_MODE_MSG_BITS = 40;
