import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  format: ["esm", "cjs"],
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  target: "es2020",
  outExtension: ({ format }) =>
    format === "esm" ? { js: ".mjs" } : { js: ".cjs" },
});
