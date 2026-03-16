# etiket

Zero-dependency barcode & QR code SVG generator. Pure ESM, lightweight (~4KB gzip), works everywhere.

## Install

```bash
npm install etiket
# or
pnpm add etiket
```

## Usage

```ts
import { barcode, qrcode } from 'etiket'

// Code 128 barcode
const svg = barcode('Hello World')

// EAN-13 barcode
const ean = barcode('4006381333931', { type: 'ean13', showText: true })

// QR code
const qr = qrcode('https://example.com')
```

## API

### `barcode(text, options?)`

Generate a 1D barcode as SVG string.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | `'code128' \| 'ean13' \| 'ean8'` | `'code128'` | Barcode type |
| `height` | `number` | `80` | Bar height in pixels |
| `barWidth` | `number` | `2` | Width multiplier per module |
| `color` | `string` | `'#000'` | Bar color |
| `background` | `string` | `'#fff'` | Background color |
| `showText` | `boolean` | `false` | Show text below barcode |
| `fontSize` | `number` | `14` | Text font size |
| `margin` | `number` | `10` | Margin around barcode |

### `qrcode(text, options?)`

Generate a QR code as SVG string.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | `number` | `200` | SVG size in pixels |
| `color` | `string` | `'#000'` | Module color |
| `background` | `string` | `'#fff'` | Background color |
| `margin` | `number` | `4` | Quiet zone modules |

### Advanced: Raw encoders

```ts
import { encodeCode128, encodeEAN13, encodeQR, renderBarcodeSVG, renderQRCodeSVG } from 'etiket'

// Get raw bar widths
const bars = encodeCode128('data')

// Get raw QR matrix
const matrix = encodeQR('data')

// Custom SVG rendering
const svg = renderBarcodeSVG(bars, { height: 100, barWidth: 3 })
const qrSvg = renderQRCodeSVG(matrix, { size: 400 })
```

## Features

- Zero dependencies
- Pure ESM + CJS dual export
- TypeScript native
- SVG string output (no DOM required)
- Works in browser, Node.js, Deno, Bun, workers
- ~4KB gzipped

## Supported formats

- **Code 128** Auto (automatic A/B/C charset optimization)
- **EAN-13** (with auto check digit)
- **EAN-8** (with auto check digit)
- **QR Code** (byte mode, EC level M, versions 1-10)

## License

MIT
