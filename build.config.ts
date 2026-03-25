import { defineBuildConfig } from "obuild/config";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: [
        "./src/index.ts",
        "./src/barcode.ts",
        "./src/qr.ts",
        "./src/datamatrix.ts",
        "./src/pdf417.ts",
        "./src/aztec.ts",
        "./src/png.ts",
        "./src/cli.ts",
      ],
      minify: true,
    },
  ],
});
