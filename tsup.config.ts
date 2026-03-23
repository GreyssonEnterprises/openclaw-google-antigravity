import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  // openclaw is a peer dep — types only, no runtime imports needed
  // @mariozechner/pi-ai gets bundled in for the OAuth logic
  external: [/^openclaw/],
  clean: true,
  dts: false,
  splitting: false,
  sourcemap: false,
  minify: false,
  outDir: "dist",
});
