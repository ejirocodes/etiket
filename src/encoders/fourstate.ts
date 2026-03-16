/**
 * 4-state barcode encoders
 * Shared engine for RM4SCC (Royal Mail), KIX (Dutch), and related postal formats
 *
 * 4-state barcodes use bars with 4 possible states:
 * - Tracker (T): short center bar
 * - Ascender (A): extends above center
 * - Descender (D): extends below center
 * - Full (F): extends both above and below
 */

import { InvalidInputError } from "../errors";

/** Bar state in a 4-state barcode */
export type FourState = "T" | "A" | "D" | "F";

// RM4SCC encoding derived from 6x6 row/col matrix per Royal Mail specification
// Characters 0-9, A-Z are assigned sequential indices 0-35 in a 6x6 grid.
// Each character's index → (row = floor(idx/6), col = idx%6).
// Row and col values (0-5) each encode as 2 bar states:
//   0=TT, 1=TA, 2=TF, 3=AT, 4=AF, 5=FT
// So each character = row_pair + col_pair = 4 bars total.
const ROW_COL_BARS: FourState[][] = [
  ["T", "T"], // 0
  ["T", "A"], // 1
  ["T", "F"], // 2
  ["A", "T"], // 3
  ["A", "F"], // 4
  ["F", "T"], // 5
];

const RM4SCC_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function rm4sccEncode(ch: string): FourState[] {
  const idx = RM4SCC_CHARS.indexOf(ch);
  if (idx === -1) throw new InvalidInputError(`Invalid RM4SCC character: ${ch}`);
  const row = Math.floor(idx / 6);
  const col = idx % 6;
  return [...ROW_COL_BARS[row]!, ...ROW_COL_BARS[col]!];
}

// Build lookup table for fast access
const RM4SCC_TABLE: Record<string, FourState[]> = {};
for (const ch of RM4SCC_CHARS) {
  RM4SCC_TABLE[ch] = rm4sccEncode(ch);
}

/** Calculate RM4SCC check digit (modulo 6 row+col system) */
function rm4sccCheckDigit(text: string): string {
  let rowSum = 0;
  let colSum = 0;
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const ch of text.toUpperCase()) {
    const idx = chars.indexOf(ch);
    if (idx === -1) continue;
    rowSum += Math.floor(idx / 6);
    colSum += idx % 6;
  }
  const checkIdx = (rowSum % 6) * 6 + (colSum % 6);
  return chars[checkIdx]!;
}

/**
 * Encode Royal Mail 4-State Customer Code (RM4SCC)
 * Used by Royal Mail for automated letter sorting
 *
 * @param text - Postcode + Delivery Point Suffix (alphanumeric, A-Z 0-9)
 * @returns Array of FourState values
 */
export function encodeRM4SCC(text: string): FourState[] {
  const upper = text.toUpperCase().replace(/\s/g, "");
  if (!/^[0-9A-Z]+$/.test(upper)) {
    throw new InvalidInputError("RM4SCC only accepts A-Z and 0-9");
  }

  const check = rm4sccCheckDigit(upper);
  const dataWithCheck = upper + check;

  const bars: FourState[] = ["A"]; // Start: ascender

  for (const ch of dataWithCheck) {
    const pattern = RM4SCC_TABLE[ch];
    if (!pattern) throw new InvalidInputError(`Invalid RM4SCC character: ${ch}`);
    bars.push(...pattern);
  }

  bars.push("F"); // Stop: full bar

  return bars;
}

/**
 * Encode KIX (Klant Index) barcode — Dutch PostNL
 * Same encoding as RM4SCC but without start/stop bars and no check digit
 *
 * @param text - 6 characters (postcode part)
 * @returns Array of FourState values
 */
export function encodeKIX(text: string): FourState[] {
  const upper = text.toUpperCase().replace(/\s/g, "");
  if (!/^[0-9A-Z]+$/.test(upper)) {
    throw new InvalidInputError("KIX only accepts A-Z and 0-9");
  }

  const bars: FourState[] = [];

  for (const ch of upper) {
    const pattern = RM4SCC_TABLE[ch];
    if (!pattern) throw new InvalidInputError(`Invalid KIX character: ${ch}`);
    bars.push(...pattern);
  }

  return bars;
}

// Australia Post 4-State barcode

// GF(4) arithmetic for Australia Post Reed-Solomon
// GF(4) = GF(2²) with irreducible polynomial x² + x + 1
// Elements: 0, 1, 2(=α), 3(=α+1=α²)
// Addition: XOR
// Multiplication table:
const GF4_MUL: number[][] = [
  [0, 0, 0, 0],
  [0, 1, 2, 3],
  [0, 2, 3, 1],
  [0, 3, 1, 2],
];

const BAR_TO_GF4: Record<FourState, number> = { T: 0, A: 1, D: 2, F: 3 };
const GF4_TO_BAR: FourState[] = ["T", "A", "D", "F"];

// Generator polynomial: g(x) = (x-1)(x-α)(x-α²)(x-α³)
// Since α³=1 in GF(4), this is (x+1)²(x+2)(x+3)
// = (x²+1)(x²+x+1) = x⁴+x³+x+1
// Coefficients [x⁴, x³, x², x¹, x⁰] = [1, 1, 0, 1, 1]
const AUSPOST_GEN = [1, 1, 0, 1, 1];

/** Compute 4 Reed-Solomon parity symbols over GF(4) for Australia Post */
function auspostReedSolomon(data: FourState[]): FourState[] {
  const n = AUSPOST_GEN.length - 1; // 4 parity symbols
  const remainder = [0, 0, 0, 0];

  for (const bar of data) {
    const feedback = BAR_TO_GF4[bar] ^ remainder[0]!;
    for (let i = 0; i < n - 1; i++) {
      remainder[i] = remainder[i + 1]! ^ GF4_MUL[feedback]![AUSPOST_GEN[i + 1]!]!;
    }
    remainder[n - 1] = GF4_MUL[feedback]![AUSPOST_GEN[n]!]!;
  }

  return remainder.map((v) => GF4_TO_BAR[v]!) as FourState[];
}

const AUSPOST_N_TABLE: Record<string, FourState[]> = {
  "0": ["F", "F"],
  "1": ["A", "D"],
  "2": ["A", "F"],
  "3": ["A", "T"],
  "4": ["D", "A"],
  "5": ["D", "D"],
  "6": ["D", "F"],
  "7": ["D", "T"],
  "8": ["F", "A"],
  "9": ["F", "D"],
};

/**
 * Encode Australia Post 4-State barcode
 *
 * @param fcc - Format control code: "11", "59", "62"
 * @param dpid - 8-digit Delivery Point Identifier
 */
export function encodeAustraliaPost(fcc: string, dpid: string): FourState[] {
  if (!/^\d{2}$/.test(fcc)) {
    throw new InvalidInputError("Australia Post FCC must be 2 digits");
  }
  if (!/^\d{8}$/.test(dpid)) {
    throw new InvalidInputError("Australia Post DPID must be 8 digits");
  }

  const data = fcc + dpid;
  const bars: FourState[] = ["F", "A"]; // Start

  for (const ch of data) {
    bars.push(...AUSPOST_N_TABLE[ch]!);
  }

  // Reed-Solomon parity over GF(4)
  const dataBars = bars.slice(2); // exclude start bars
  const parity = auspostReedSolomon(dataBars);
  bars.push(...parity);
  bars.push("F", "A"); // Stop

  return bars;
}

// Japan Post 4-State barcode
const JP_TABLE: Record<string, FourState[]> = {
  "0": ["F", "F", "T"],
  "1": ["D", "A", "F"],
  "2": ["D", "F", "A"],
  "3": ["A", "D", "F"],
  "4": ["F", "D", "A"],
  "5": ["A", "F", "D"],
  "6": ["F", "A", "D"],
  "7": ["D", "D", "A"],
  "8": ["D", "A", "D"],
  "9": ["A", "D", "D"],
  "-": ["F", "T", "F"],
};

/**
 * Encode Japan Post 4-State Customer barcode (JP4SCC / Kasutama)
 *
 * @param zipcode - 7-digit Japanese postal code
 * @param address - Optional address digits (up to 13 chars)
 */
export function encodeJapanPost(zipcode: string, address?: string): FourState[] {
  const zip = zipcode.replace(/-/g, "");
  if (!/^\d{7}$/.test(zip)) {
    throw new InvalidInputError("Japan Post zipcode must be 7 digits");
  }

  let data = zip;
  if (address) {
    const clean = address.replace(/\s/g, "");
    if (!/^[\d-]+$/.test(clean)) {
      throw new InvalidInputError("Japan Post address only accepts digits and dash");
    }
    data += clean;
  }

  while (data.length < 20) data += "-";
  data = data.substring(0, 20);

  let sum = 0;
  for (const ch of data) {
    sum += ch === "-" ? 10 : Number.parseInt(ch, 10);
  }
  data += ((10 - (sum % 10)) % 10).toString();

  const bars: FourState[] = ["F", "D"]; // Start

  for (const ch of data) {
    const pattern = JP_TABLE[ch];
    if (!pattern) throw new InvalidInputError(`Invalid Japan Post character: ${ch}`);
    bars.push(...pattern);
  }

  bars.push("F", "A"); // Stop
  return bars;
}
