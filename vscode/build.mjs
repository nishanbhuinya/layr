import { build } from "esbuild";

const common = { bundle: true, platform: "node", target: "node20", format: "cjs", sourcemap: true, logLevel: "info", minify: true };
await build({ ...common, entryPoints: ["src/extension.ts"], outfile: "dist/extension.js", external: ["vscode"] });
await build({ ...common, entryPoints: ["src/server.ts"], outfile: "dist/server.js", external: ["vite"] });
