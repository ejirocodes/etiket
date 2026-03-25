/**
 * PNG output for barcodes and 2D codes
 */

import { encodeBars } from "./_barcode";
import { encodeQR } from "./encoders/qr/index";
import { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index";
import { encodePDF417 } from "./encoders/pdf417/index";
import { encodeAztec } from "./encoders/aztec/index";
import { renderBarcodePNG } from "./renderers/png/rasterize";
import { renderMatrixPNG } from "./renderers/png/rasterize";
import type { BarcodeOptions } from "./_types";
import type { QRCodeOptions } from "./encoders/qr/types";
import type { BarcodePNGOptions, MatrixPNGOptions } from "./renderers/png/types";

function uint8ToBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!);
  }
  return btoa(binary);
}

function toPNGDataURI(data: Uint8Array): string {
  return `data:image/png;base64,${uint8ToBase64(data)}`;
}

/**
 * Generate a barcode as PNG
 */
export function barcodePNG(text: string, options?: BarcodeOptions & BarcodePNGOptions): Uint8Array {
  const bars = encodeBars(text, options);
  return renderBarcodePNG(bars, options);
}

/**
 * Generate a barcode as PNG data URI
 */
export function barcodePNGDataURI(
  text: string,
  options?: BarcodeOptions & BarcodePNGOptions,
): string {
  return toPNGDataURI(barcodePNG(text, options));
}

/**
 * Generate a QR code as PNG
 */
export function qrcodePNG(text: string, options?: QRCodeOptions & MatrixPNGOptions): Uint8Array {
  const matrix = encodeQR(text, options);
  return renderMatrixPNG(matrix, options);
}

/**
 * Generate a QR code as PNG data URI
 */
export function qrcodePNGDataURI(text: string, options?: QRCodeOptions & MatrixPNGOptions): string {
  return toPNGDataURI(qrcodePNG(text, options));
}

/**
 * Generate a Data Matrix as PNG
 */
export function datamatrixPNG(text: string, options?: MatrixPNGOptions): Uint8Array {
  const matrix = encodeDataMatrix(text);
  return renderMatrixPNG(matrix, options);
}

/**
 * Generate a Data Matrix as PNG data URI
 */
export function datamatrixPNGDataURI(text: string, options?: MatrixPNGOptions): string {
  return toPNGDataURI(datamatrixPNG(text, options));
}

/**
 * Generate a GS1 Data Matrix as PNG
 */
export function gs1datamatrixPNG(text: string, options?: MatrixPNGOptions): Uint8Array {
  const matrix = encodeGS1DataMatrix(text);
  return renderMatrixPNG(matrix, options);
}

/**
 * Generate a GS1 Data Matrix as PNG data URI
 */
export function gs1datamatrixPNGDataURI(text: string, options?: MatrixPNGOptions): string {
  return toPNGDataURI(gs1datamatrixPNG(text, options));
}

/**
 * Generate a PDF417 barcode as PNG
 */
export function pdf417PNG(
  text: string,
  options?: { ecLevel?: number; columns?: number; compact?: boolean } & MatrixPNGOptions,
): Uint8Array {
  const { ecLevel, columns, compact, ...pngOpts } = options ?? {};
  const result = encodePDF417(text, { ecLevel, columns, compact });
  return renderMatrixPNG(result.matrix, pngOpts);
}

/**
 * Generate a PDF417 barcode as PNG data URI
 */
export function pdf417PNGDataURI(
  text: string,
  options?: { ecLevel?: number; columns?: number; compact?: boolean } & MatrixPNGOptions,
): string {
  return toPNGDataURI(pdf417PNG(text, options));
}

/**
 * Generate an Aztec Code as PNG
 */
export function aztecPNG(
  text: string,
  options?: { ecPercent?: number; layers?: number; compact?: boolean } & MatrixPNGOptions,
): Uint8Array {
  const { ecPercent, layers, compact, ...pngOpts } = options ?? {};
  const matrix = encodeAztec(text, { ecPercent, layers, compact });
  return renderMatrixPNG(matrix, { margin: 0, ...pngOpts });
}

/**
 * Generate an Aztec Code as PNG data URI
 */
export function aztecPNGDataURI(
  text: string,
  options?: { ecPercent?: number; layers?: number; compact?: boolean } & MatrixPNGOptions,
): string {
  return toPNGDataURI(aztecPNG(text, options));
}
