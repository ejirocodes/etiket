/**
 * Data URI encoding utilities
 */

/**
 * Convert SVG string to a data URI
 */
export function svgToDataURI(svg: string): string {
  // Use percent-encoding which is more compact for SVGs
  const encoded = svg
    .replace(/\s+/g, " ")
    .replace(/"/g, "'")
    .replace(/#/g, "%23")
    .replace(/{/g, "%7B")
    .replace(/}/g, "%7D")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");

  return `data:image/svg+xml,${encoded}`;
}

/**
 * Convert SVG string to base64 data URI
 */
export function svgToBase64(svg: string): string {
  // Use btoa for base64 encoding
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Convert SVG string to a plain base64 string (no data URI prefix)
 */
export function svgToBase64Raw(svg: string): string {
  return btoa(unescape(encodeURIComponent(svg)));
}
