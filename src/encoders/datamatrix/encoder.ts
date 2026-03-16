/**
 * Data Matrix data encoder — ASCII encoding mode
 * Converts input text into data codewords per ISO/IEC 16022
 */

import { InvalidInputError } from "../../errors";

/**
 * Encode text into Data Matrix data codewords using ASCII encoding.
 *
 * ASCII encoding rules:
 * - ASCII values 0-127: codeword = value + 1
 * - Digit pairs "00"-"99": codeword = pair_value + 130 (single codeword for two digits)
 * - Extended ASCII 128-255: codeword 235 (Upper Shift) followed by value - 127
 */
export function encodeASCII(text: string): number[] {
  const codewords: number[] = [];
  let i = 0;

  while (i < text.length) {
    const charCode = text.charCodeAt(i);

    if (charCode > 255) {
      throw new InvalidInputError(
        `Data Matrix ASCII mode does not support character: "${text[i]}" (U+${charCode.toString(16).padStart(4, "0")})`,
      );
    }

    // Check for digit pair optimization
    if (
      charCode >= 48 &&
      charCode <= 57 && // current char is '0'-'9'
      i + 1 < text.length &&
      text.charCodeAt(i + 1) >= 48 &&
      text.charCodeAt(i + 1) <= 57 // next char is '0'-'9'
    ) {
      const pairValue = (charCode - 48) * 10 + (text.charCodeAt(i + 1) - 48);
      codewords.push(pairValue + 130);
      i += 2;
    } else if (charCode >= 128) {
      // Extended ASCII: Upper Shift + (value - 127)
      codewords.push(235);
      codewords.push(charCode - 127);
      i++;
    } else {
      // Standard ASCII: value + 1
      codewords.push(charCode + 1);
      i++;
    }
  }

  return codewords;
}

/**
 * Pad data codewords to fill the symbol capacity.
 * Uses pad value 129 with the 253-state randomization algorithm.
 */
export function padCodewords(codewords: number[], capacity: number): number[] {
  const padded = [...codewords];

  if (padded.length < capacity) {
    // First pad codeword is always 129
    padded.push(129);
  }

  // Remaining pad codewords use the 253-state randomization
  while (padded.length < capacity) {
    const position = padded.length + 1; // 1-based position
    const randomized = randomizePad(129, position);
    padded.push(randomized);
  }

  return padded;
}

/**
 * 253-state randomization algorithm for pad codewords.
 * Ensures pad values appear pseudo-random to avoid false patterns.
 */
function randomizePad(padValue: number, position: number): number {
  const pseudoRandom = ((149 * position) % 253) + 1;
  const result = padValue + pseudoRandom;
  return result <= 254 ? result : result - 254;
}
