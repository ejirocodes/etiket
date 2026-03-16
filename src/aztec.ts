/**
 * Aztec Code-only entry point for tree-shaking
 *
 * @example
 * ```ts
 * import { aztec, encodeAztec } from 'etiket/aztec'
 * ```
 */

export { aztec } from "./index";
export { encodeAztec } from "./encoders/aztec/index";
export type { AztecOptions } from "./encoders/aztec/index";
export { renderMatrixSVG } from "./renderers/svg/matrix";
