/**
 * SVG rendering utilities for barcodes and QR codes
 */

export interface BarcodeSVGOptions {
  width?: number
  height?: number
  barWidth?: number
  color?: string
  background?: string
  showText?: boolean
  text?: string
  fontSize?: number
  margin?: number
}

export interface QRCodeSVGOptions {
  size?: number
  color?: string
  background?: string
  margin?: number
}

/**
 * Render 1D barcode bars as SVG string
 */
export function renderBarcodeSVG(
  bars: number[],
  options: BarcodeSVGOptions = {},
): string {
  const {
    height = 80,
    barWidth = 2,
    color = '#000',
    background = '#fff',
    showText = false,
    text = '',
    fontSize = 14,
    margin = 10,
  } = options

  // Calculate total width from bar widths
  let totalUnits = 0
  for (const w of bars) totalUnits += w

  const barcodeWidth = totalUnits * barWidth
  const svgWidth = barcodeWidth + margin * 2
  const textHeight = showText ? fontSize + 8 : 0
  const svgHeight = height + margin * 2 + textHeight

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`,
  ]

  if (background !== 'transparent') {
    parts.push(`<rect width="100%" height="100%" fill="${background}"/>`)
  }

  // Draw bars
  let x = margin
  let isBar = true
  for (const w of bars) {
    const barPixelWidth = w * barWidth
    if (isBar) {
      parts.push(
        `<rect x="${x}" y="${margin}" width="${barPixelWidth}" height="${height}" fill="${color}"/>`,
      )
    }
    x += barPixelWidth
    isBar = !isBar
  }

  // Text below barcode
  if (showText && text) {
    const textY = margin + height + fontSize + 4
    parts.push(
      `<text x="${svgWidth / 2}" y="${textY}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="${color}">${escapeXml(text)}</text>`,
    )
  }

  parts.push('</svg>')
  return parts.join('')
}

/**
 * Render QR code matrix as SVG string
 */
export function renderQRCodeSVG(
  matrix: boolean[][],
  options: QRCodeSVGOptions = {},
): string {
  const {
    size = 200,
    color = '#000',
    background = '#fff',
    margin = 4,
  } = options

  const moduleCount = matrix.length
  const totalModules = moduleCount + margin * 2
  const moduleSize = size / totalModules

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
  ]

  if (background !== 'transparent') {
    parts.push(`<rect width="100%" height="100%" fill="${background}"/>`)
  }

  // Draw modules as a single path for efficiency
  const pathParts: string[] = []
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r]![c]) {
        const x = (c + margin) * moduleSize
        const y = (r + margin) * moduleSize
        pathParts.push(`M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`)
      }
    }
  }

  if (pathParts.length > 0) {
    parts.push(`<path d="${pathParts.join('')}" fill="${color}"/>`)
  }

  parts.push('</svg>')
  return parts.join('')
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
