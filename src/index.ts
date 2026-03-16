/**
 * etiket — Zero-dependency barcode & QR code SVG generator
 *
 * @example
 * ```ts
 * import { barcode, qrcode } from 'etiket'
 *
 * const svg = barcode('1234567890', { type: 'code128' })
 * const qr = qrcode('https://example.com')
 * ```
 */

import { encodeCode128 } from './encoders/code128'
import { encodeEAN13, encodeEAN8 } from './encoders/ean'
import { encodeQR } from './encoders/qr'
import {
  renderBarcodeSVG,
  renderQRCodeSVG,
  type BarcodeSVGOptions,
  type QRCodeSVGOptions,
} from './svg'

export type BarcodeType = 'code128' | 'ean13' | 'ean8'

export interface BarcodeOptions extends BarcodeSVGOptions {
  type?: BarcodeType
}

export type { BarcodeSVGOptions, QRCodeSVGOptions }

/**
 * Generate a barcode as SVG string
 *
 * @param text - The text/number to encode
 * @param options - Barcode options (type, dimensions, colors)
 * @returns SVG string
 *
 * @example
 * ```ts
 * // Code 128 (default)
 * barcode('Hello World')
 *
 * // EAN-13
 * barcode('4006381333931', { type: 'ean13' })
 *
 * // With text below
 * barcode('ABC-123', { showText: true, height: 60 })
 * ```
 */
export function barcode(text: string, options: BarcodeOptions = {}): string {
  const { type = 'code128', ...svgOptions } = options

  let bars: number[]

  switch (type) {
    case 'code128':
      bars = encodeCode128(text)
      break
    case 'ean13':
      bars = encodeEAN13(text).bars
      break
    case 'ean8':
      bars = encodeEAN8(text).bars
      break
    default:
      throw new Error(`Unsupported barcode type: ${type}`)
  }

  return renderBarcodeSVG(bars, {
    ...svgOptions,
    text: svgOptions.showText !== false ? (svgOptions.text ?? text) : undefined,
    showText: svgOptions.showText ?? false,
  })
}

/**
 * Generate a QR code as SVG string
 *
 * @param text - The text/URL to encode
 * @param options - QR code options (size, colors)
 * @returns SVG string
 *
 * @example
 * ```ts
 * qrcode('https://example.com')
 * qrcode('Hello', { size: 300, color: '#333' })
 * ```
 */
export function qrcode(text: string, options: QRCodeSVGOptions = {}): string {
  const matrix = encodeQR(text)
  return renderQRCodeSVG(matrix, options)
}

// Re-export encoders for advanced usage
export { encodeCode128 } from './encoders/code128'
export { encodeEAN13, encodeEAN8 } from './encoders/ean'
export { encodeQR } from './encoders/qr'
export { renderBarcodeSVG, renderQRCodeSVG } from './svg'
