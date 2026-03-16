/**
 * SVG rendering utilities for barcodes and QR codes
 * Re-exports from the new renderers module for backward compatibility
 */

export type { BarcodeSVGOptions, QRCodeSVGOptions } from "./renderers/svg/types";
export { renderBarcodeSVG } from "./renderers/svg/barcode";
export { renderQRCodeSVG } from "./renderers/svg/qr";
