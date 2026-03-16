/**
 * Data Matrix-only entry point for tree-shaking
 *
 * @example
 * ```ts
 * import { datamatrix, encodeDataMatrix } from 'etiket/datamatrix'
 * ```
 */

export { datamatrix } from "./index";
export { encodeDataMatrix } from "./encoders/datamatrix/index";
export { renderMatrixSVG } from "./renderers/svg/matrix";
