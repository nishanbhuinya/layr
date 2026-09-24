// The published build: every @layr-internal package bundled into dist/, one ES module per entry,
// with shared code split into chunks so the runtime (signals, cascade, router) exists once no
// matter which entries an app imports. React, Vite and the real dependencies stay external.
import { defineConfig } from "tsup";

/** The internal packages' sources, so their types are bundled into dist/*.d.ts. */
const INTERNAL = {
  "@layr-internal/model": ["../model/src/index.ts"],
  "@layr-internal/compiler": ["../compiler/src/index.ts"],
  "@layr-internal/runtime": ["../runtime/src/index.ts"],
  "@layr-internal/react": ["../react/src/index.ts"],
  "@layr-internal/react/ssr": ["../react/src/ssr.ts"],
  "@layr-internal/react/tsx": ["../react/src/tsx.tsx"],
  "@layr-internal/node": ["../node/src/index.ts"],
  "@layr-internal/cli": ["../cli/src/index.ts"],
  "@layr-internal/cli/vite": ["../cli/src/vite.ts"],
  "@layr-internal/lsp": ["../lsp/src/index.ts"],
};

export default defineConfig({
  entry: {
    index: "src/index.ts",
    react: "src/react.ts",
    runtime: "src/runtime.ts",
    vite: "src/vite.ts",
    ssr: "src/ssr.ts",
    compiler: "src/compiler.ts",
    schema: "src/schema.ts",
    tsx: "src/tsx.ts",
    bin: "src/bin.ts",
  },
  format: ["esm"],
  target: "node20",
  platform: "neutral",
  splitting: true,
  treeshake: true,
  clean: true,
  dts: { entry: { index: "src/index.ts", react: "src/react.ts", runtime: "src/runtime.ts", vite: "src/vite.ts", ssr: "src/ssr.ts", compiler: "src/compiler.ts", schema: "src/schema.ts", tsx: "src/tsx.ts" }, resolve: [/^@layr-internal\//], compilerOptions: { ignoreDeprecations: "6.0", baseUrl: ".", paths: INTERNAL, jsx: "react-jsx", allowImportingTsExtensions: true, skipLibCheck: true } },
  noExternal: [/^@layr-internal\//],
  external: [/^react($|\/)/, /^react-dom($|\/)/, "vite", "playwright", /^node:/],
  outExtension: () => ({ js: ".js" }),
});
