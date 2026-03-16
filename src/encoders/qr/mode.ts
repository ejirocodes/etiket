/**
 * QR Code encoding modes - detection and encoding
 */

import { ALPHANUMERIC_CHARS } from "./tables";

/** Check if a string can be encoded in numeric mode */
export function isNumeric(text: string): boolean {
  return /^\d+$/.test(text);
}

/** Check if a string can be encoded in alphanumeric mode */
export function isAlphanumeric(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (ALPHANUMERIC_CHARS.indexOf(text[i]!) === -1) return false;
  }
  return true;
}

/** Check if a string can be encoded in Kanji mode (Shift JIS double-byte) */
export function isKanji(_text: string): boolean {
  // Kanji detection requires checking Shift JIS encoding ranges
  // For now, return false - users can explicitly set kanji mode
  return false;
}

/** Auto-detect the best encoding mode for the given text */
export function detectMode(text: string): "numeric" | "alphanumeric" | "byte" | "kanji" {
  if (isNumeric(text)) return "numeric";
  if (isAlphanumeric(text)) return "alphanumeric";
  return "byte";
}

/** Get alphanumeric character value (0-44) */
export function getAlphanumericValue(char: string): number {
  const idx = ALPHANUMERIC_CHARS.indexOf(char);
  if (idx === -1) throw new Error(`Invalid alphanumeric character: ${char}`);
  return idx;
}

/** Encode numeric data to bits */
export function encodeNumericData(text: string): number[] {
  const bits: number[] = [];
  let i = 0;

  // Process groups of 3 digits -> 10 bits
  while (i + 2 < text.length) {
    const val = Number.parseInt(text.substring(i, i + 3), 10);
    pushBits(bits, val, 10);
    i += 3;
  }

  // Remaining 2 digits -> 7 bits
  if (i + 1 < text.length) {
    const val = Number.parseInt(text.substring(i, i + 2), 10);
    pushBits(bits, val, 7);
    i += 2;
  }

  // Remaining 1 digit -> 4 bits
  if (i < text.length) {
    const val = Number.parseInt(text[i]!, 10);
    pushBits(bits, val, 4);
  }

  return bits;
}

/** Encode alphanumeric data to bits */
export function encodeAlphanumericData(text: string): number[] {
  const bits: number[] = [];
  let i = 0;

  // Process pairs -> 11 bits each
  while (i + 1 < text.length) {
    const val = getAlphanumericValue(text[i]!) * 45 + getAlphanumericValue(text[i + 1]!);
    pushBits(bits, val, 11);
    i += 2;
  }

  // Remaining single character -> 6 bits
  if (i < text.length) {
    pushBits(bits, getAlphanumericValue(text[i]!), 6);
  }

  return bits;
}

/** Encode byte data to bits */
export function encodeByteData(data: Uint8Array): number[] {
  const bits: number[] = [];
  for (const byte of data) {
    pushBits(bits, byte, 8);
  }
  return bits;
}

/** Push a value as the specified number of bits (MSB first) */
export function pushBits(arr: number[], value: number, count: number): void {
  for (let i = count - 1; i >= 0; i--) {
    arr.push((value >> i) & 1);
  }
}
