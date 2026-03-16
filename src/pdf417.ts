/**
 * PDF417-only entry point for tree-shaking
 *
 * @example
 * ```ts
 * import { pdf417, encodePDF417 } from 'etiket/pdf417'
 * ```
 */

export { pdf417 } from "./index";
export { encodePDF417 } from "./encoders/pdf417/index";
export type { PDF417Options } from "./encoders/pdf417/index";
export { renderMatrixSVG } from "./renderers/svg/matrix";
