/**
 * Micro QR Code encoder (M1-M4)
 * Simplified versions with single finder pattern
 */

// Micro QR is a future enhancement
// This module provides the types and stubs for Micro QR support

export interface MicroQROptions {
  version?: 1 | 2 | 3 | 4; // M1-M4
  ecLevel?: "L" | "M" | "Q"; // H not available in Micro QR
}

/**
 * Micro QR sizes:
 * M1: 11x11 modules
 * M2: 13x13 modules
 * M3: 15x15 modules
 * M4: 17x17 modules
 */
export const MICRO_QR_SIZES = [11, 13, 15, 17] as const;

// Placeholder for future implementation
export function encodeMicroQR(_text: string, _options?: MicroQROptions): boolean[][] {
  throw new Error("Micro QR Code is not yet implemented");
}
