/**
 * PNG rendering types
 */

export interface BarcodePNGOptions {
  /** Pixels per bar unit width (default: 2) */
  scale?: number;
  /** Image height in pixels (default: 80) */
  height?: number;
  /** Quiet zone in pixels (default: 10) */
  margin?: number;
  /** Foreground color as hex string (default: "#000000") */
  color?: string;
  /** Background color as hex string (default: "#ffffff") */
  background?: string;
}

export interface MatrixPNGOptions {
  /** Pixels per module (default: 10) */
  moduleSize?: number;
  /** Quiet zone in modules (default: 4) */
  margin?: number;
  /** Foreground color as hex string (default: "#000000") */
  color?: string;
  /** Background color as hex string (default: "#ffffff") */
  background?: string;
}

/**
 * Parse a hex color string to [r, g, b] tuple.
 * Supports "#RGB", "#RRGGBB", "RGB", "RRGGBB".
 */
export function parseHexColor(hex: string): [number, number, number] {
  let h = hex.startsWith("#") ? hex.slice(1) : hex;
  if (h.length === 3) {
    h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  }
  if (h.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
