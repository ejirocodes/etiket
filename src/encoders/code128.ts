/**
 * Code 128 barcode encoder
 * Supports Code 128 Auto (automatic charset selection: A, B, C)
 */

// Code 128 encoding patterns (bar/space widths)
// Each pattern is 6 elements: bar, space, bar, space, bar, space
const PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], // 0
  [2, 2, 2, 1, 2, 2], // 1
  [2, 2, 2, 2, 2, 1], // 2
  [1, 2, 1, 2, 2, 3], // 3
  [1, 2, 1, 3, 2, 2], // 4
  [1, 3, 1, 2, 2, 2], // 5
  [1, 2, 2, 2, 1, 3], // 6
  [1, 2, 2, 3, 1, 2], // 7
  [1, 3, 2, 2, 1, 2], // 8
  [2, 2, 1, 2, 1, 3], // 9
  [2, 2, 1, 3, 1, 2], // 10
  [2, 3, 1, 2, 1, 2], // 11
  [1, 1, 2, 2, 3, 2], // 12
  [1, 2, 2, 1, 3, 2], // 13
  [1, 2, 2, 2, 3, 1], // 14
  [1, 1, 3, 2, 2, 2], // 15
  [1, 2, 3, 1, 2, 2], // 16
  [1, 2, 3, 2, 2, 1], // 17
  [2, 2, 3, 2, 1, 1], // 18
  [2, 2, 1, 1, 3, 2], // 19
  [2, 2, 1, 2, 3, 1], // 20
  [2, 1, 3, 2, 1, 2], // 21
  [2, 2, 3, 1, 1, 2], // 22
  [3, 1, 2, 1, 3, 1], // 23
  [3, 1, 1, 2, 2, 2], // 24
  [3, 2, 1, 1, 2, 2], // 25
  [3, 2, 1, 2, 2, 1], // 26
  [3, 1, 2, 2, 1, 2], // 27
  [3, 2, 2, 1, 1, 2], // 28
  [3, 2, 2, 2, 1, 1], // 29
  [2, 1, 2, 1, 2, 3], // 30
  [2, 1, 2, 3, 2, 1], // 31
  [2, 3, 2, 1, 2, 1], // 32
  [1, 1, 1, 3, 2, 3], // 33
  [1, 3, 1, 1, 2, 3], // 34
  [1, 3, 1, 3, 2, 1], // 35
  [1, 1, 2, 3, 1, 3], // 36
  [1, 3, 2, 1, 1, 3], // 37
  [1, 3, 2, 3, 1, 1], // 38
  [2, 1, 1, 3, 1, 3], // 39
  [2, 3, 1, 1, 1, 3], // 40
  [2, 3, 1, 3, 1, 1], // 41
  [1, 1, 2, 1, 3, 3], // 42
  [1, 1, 2, 3, 3, 1], // 43
  [1, 3, 2, 1, 3, 1], // 44
  [1, 1, 3, 1, 2, 3], // 45
  [1, 1, 3, 3, 2, 1], // 46
  [1, 3, 3, 1, 2, 1], // 47
  [3, 1, 3, 1, 2, 1], // 48
  [2, 1, 1, 3, 3, 1], // 49
  [2, 3, 1, 1, 3, 1], // 50
  [2, 1, 3, 1, 1, 3], // 51
  [2, 1, 3, 3, 1, 1], // 52
  [2, 1, 3, 1, 3, 1], // 53
  [3, 1, 1, 1, 2, 3], // 54
  [3, 1, 1, 3, 2, 1], // 55
  [3, 3, 1, 1, 2, 1], // 56
  [3, 1, 2, 1, 1, 3], // 57
  [3, 1, 2, 3, 1, 1], // 58
  [3, 3, 2, 1, 1, 1], // 59
  [2, 1, 2, 1, 3, 2], // 60 (FNC3 in A, '`' in B)
  [2, 1, 2, 2, 3, 1], // 61 (FNC2 in A, 'a' in B)
  [2, 1, 2, 3, 1, 2], // 62 (SHIFT in A, 'b' in B)
  [1, 4, 2, 1, 1, 2], // 63
  [1, 1, 4, 2, 1, 2], // 64
  [1, 2, 4, 1, 1, 2], // 65
  [1, 1, 1, 2, 4, 2], // 66 (FNC1)
  [1, 2, 1, 1, 4, 2], // 67
  [1, 2, 1, 2, 4, 1], // 68
  [4, 2, 1, 1, 1, 2], // 69
  [4, 2, 1, 2, 1, 1], // 70
  [4, 1, 2, 1, 1, 2], // 71
  [2, 4, 1, 2, 1, 1], // 72
  [2, 2, 1, 4, 1, 1], // 73
  [4, 1, 1, 2, 1, 2], // 74
  [1, 1, 1, 2, 2, 4], // 75
  [1, 1, 1, 4, 2, 2], // 76
  [1, 2, 1, 1, 2, 4], // 77
  [1, 2, 1, 4, 2, 1], // 78
  [1, 4, 1, 1, 2, 2], // 79
  [1, 4, 1, 2, 2, 1], // 80
  [1, 1, 2, 2, 1, 4], // 81
  [1, 1, 2, 4, 1, 2], // 82
  [1, 2, 2, 1, 1, 4], // 83
  [1, 2, 2, 4, 1, 1], // 84
  [1, 4, 2, 1, 1, 2], // 85
  [1, 4, 2, 2, 1, 1], // 86
  [2, 4, 1, 1, 1, 2], // 87
  [2, 2, 1, 1, 1, 4], // 88
  [4, 1, 1, 2, 2, 1], // 89 (FNC4 in A)
  [4, 2, 2, 1, 1, 1], // 90 (FNC4 in B)
  [2, 1, 2, 1, 4, 1], // 91
  [2, 1, 4, 1, 2, 1], // 92
  [4, 1, 2, 1, 2, 1], // 93
  [1, 1, 1, 1, 4, 3], // 94
  [1, 1, 1, 3, 4, 1], // 95
  [1, 3, 1, 1, 4, 1], // 96 (CODE_A in B/C)
  [1, 1, 4, 1, 1, 3], // 97 (CODE_B in A/C)
  [1, 1, 4, 3, 1, 1], // 98 (CODE_C in A/B)
  [4, 1, 1, 1, 1, 3], // 99 (CODE_C)
  [4, 1, 1, 3, 1, 1], // 100 (FNC1 / CODE_B)
  [1, 1, 3, 1, 4, 1], // 101 (CODE_A)
  [1, 1, 4, 1, 3, 1], // 102 (FNC1)
  [2, 1, 1, 4, 1, 2], // 103 (START_A)
  [2, 1, 1, 2, 1, 4], // 104 (START_B)
  [2, 1, 1, 2, 3, 2], // 105 (START_C)
];

const STOP_PATTERN = [2, 3, 3, 1, 1, 1, 2]; // 7 elements

const START_A = 103;
const START_B = 104;
const START_C = 105;
const CODE_A = 101;
const CODE_B = 100;
const CODE_C = 99;

/**
 * Encode text as Code 128 Auto (optimized charset selection)
 * Returns array of bar widths (alternating bar/space)
 */
export function encodeCode128(text: string): number[] {
  const codes = autoEncode(text);
  const bars: number[] = [];

  for (const code of codes) {
    const pattern = PATTERNS[code]!;
    for (const width of pattern) {
      bars.push(width);
    }
  }

  // Stop pattern
  for (const width of STOP_PATTERN) {
    bars.push(width);
  }

  return bars;
}

function autoEncode(text: string): number[] {
  // Determine optimal start code
  const codes: number[] = [];
  let pos = 0;

  // Check if we should start with Code C (numeric pairs)
  const numericRun = countNumericFromPos(text, 0);

  if (numericRun >= 4) {
    codes.push(START_C);
    pos = encodeCodeC(text, pos, codes);
  } else {
    codes.push(START_B);
  }

  let currentSet: "A" | "B" | "C" = codes[0] === START_C ? "C" : "B";

  while (pos < text.length) {
    if (currentSet === "C") {
      // In Code C, check if we should switch
      const remaining = countNumericFromPos(text, pos);
      if (remaining >= 2) {
        pos = encodeCodeC(text, pos, codes);
      } else {
        codes.push(CODE_B);
        currentSet = "B";
      }
    } else {
      // In Code B (or A), check if switching to C is beneficial
      const numRun = countNumericFromPos(text, pos);
      if (numRun >= 4 || (numRun >= 2 && pos + numRun >= text.length)) {
        codes.push(CODE_C);
        currentSet = "C";
        pos = encodeCodeC(text, pos, codes);
      } else {
        const charCode = text.charCodeAt(pos);
        if (charCode >= 32 && charCode <= 126) {
          // Code B
          codes.push(charCode - 32);
        } else if (charCode >= 0 && charCode < 32) {
          // Need Code A for control chars
          if (currentSet !== "A") {
            codes.push(CODE_A);
            currentSet = "A";
          }
          codes.push(charCode + 64);
        }
        pos++;
      }
    }
  }

  // Calculate checksum
  let checksum = codes[0]!;
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i]! * i;
  }
  codes.push(checksum % 103);

  return codes;
}

function encodeCodeC(text: string, pos: number, codes: number[]): number {
  while (pos + 1 < text.length) {
    const d1 = text.charCodeAt(pos) - 48;
    const d2 = text.charCodeAt(pos + 1) - 48;
    if (d1 < 0 || d1 > 9 || d2 < 0 || d2 > 9) break;
    codes.push(d1 * 10 + d2);
    pos += 2;
  }
  return pos;
}

function countNumericFromPos(text: string, pos: number): number {
  let count = 0;
  while (pos + count < text.length) {
    const c = text.charCodeAt(pos + count);
    if (c < 48 || c > 57) break;
    count++;
  }
  return count;
}
