/**
 * QR Code-only entry point for tree-shaking
 *
 * @example
 * ```ts
 * import { qrcode, encodeQR } from 'etiket/qr'
 * ```
 */

export { qrcode, qrcodeTerminal, qrcodeDataURI, qrcodeBase64 } from "./index";
export type { QRCodeSVGOptions, QRCodeOptions, ErrorCorrectionLevel, EncodingMode } from "./index";
export type { DotType, GradientOptions, CornerOptions, LogoOptions } from "./renderers/svg/types";

// Encoder
export { encodeQR } from "./encoders/qr/index";

// Renderer
export { renderQRCodeSVG } from "./renderers/svg/qr";
export { renderText } from "./renderers/text";
