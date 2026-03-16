/**
 * Data Matrix ECC 200 encoder
 * Supports ASCII encoding mode for text input
 *
 * Based on ISO/IEC 16022
 */

import { InvalidInputError, CapacityError } from "../../errors";
import { encodeASCII, padCodewords } from "./encoder";
import { selectSymbolSize } from "./tables";
import { generateInterleavedEC } from "./reed-solomon";
import { placeModules } from "./placement";

/**
 * Encode text as a Data Matrix ECC 200 symbol.
 * Returns a 2D boolean array (true = dark module).
 *
 * @param text - The text to encode (ASCII characters 0-255)
 * @returns 2D boolean matrix representing the Data Matrix symbol
 *
 * @example
 * ```ts
 * const matrix = encodeDataMatrix('Hello')
 * // matrix[row][col] === true means dark module
 * ```
 */
export function encodeDataMatrix(text: string): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("Data Matrix input must not be empty");
  }

  // Step 1: Encode text to data codewords (ASCII mode)
  const dataCodewords = encodeASCII(text);

  // Step 2: Select the smallest symbol size that fits the data
  const symbol = selectSymbolSize(dataCodewords.length);
  if (!symbol) {
    throw new CapacityError(
      `Data too long for Data Matrix: ${dataCodewords.length} codewords needed, maximum is 1558`,
    );
  }

  // Step 3: Pad data codewords to fill symbol capacity
  const paddedData = padCodewords(dataCodewords, symbol.totalDataCodewords);

  // Step 4: Generate error correction codewords
  const ecCodewords = generateInterleavedEC(
    paddedData,
    symbol.ecCodewords,
    symbol.interleavedBlocks,
  );

  // Step 5: Combine data and EC codewords
  const allCodewords = [...paddedData, ...ecCodewords];

  // Step 6: Place codewords into the matrix with finder patterns
  return placeModules(allCodewords, symbol);
}
