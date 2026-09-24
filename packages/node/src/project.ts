/** Node-side project loading shared by the CLI, the language server and the MCP server. */
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { LoadedConfig } from "./config.ts";
import { listLayrFiles } from "./files.ts";

/** The directories whose `.layr` files form the project: src, examples (addons), installed addons. */
export function projectDirs(root: string, config: LoadedConfig): string[] {
  return [join(root, "src"), ...(config.isAddon ? [join(root, "examples")] : []), ...[...config.addons.values()].map((a) => join(a.dir, "src"))];
}

export function readProjectFiles(root: string, config: LoadedConfig): Array<{ abs: string; path: string; text: string }> {
  return projectDirs(root, config)
    .flatMap((d) => listLayrFiles(d))
    .map((abs) => ({ abs, path: relative(root, abs).replace(/\\/g, "/"), text: readFileSync(abs, "utf8") }));
}
