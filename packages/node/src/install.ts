/**
 * The `@dynshift/layr` a project installs. A global `layr`, the VS Code extension and agents' tools
 * all run the project's own version, so the rules they check by are the rules it builds with.
 * No dependencies beyond Node, so the editor extension can bundle it cheaply.
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface LayrInstall {
  /** The package directory (symlinks resolved). */
  root: string;
  version: string;
  /** The `layr` executable module of that version. */
  bin: string;
}

/** Reads an `@dynshift/layr` package directory, or null when it is not one. */
export function readLayrInstall(dir: string): LayrInstall | null {
  const file = join(dir, "package.json");
  if (!existsSync(file)) return null;
  try {
    const pkg = JSON.parse(readFileSync(file, "utf8")) as { name?: string; version?: string; bin?: string | Record<string, string> };
    if (pkg.name !== "@dynshift/layr" || !pkg.version) return null;
    const rel = typeof pkg.bin === "string" ? pkg.bin : (pkg.bin?.layr ?? "dist/bin.js");
    const root = realpathSync(dir);
    return { root, version: pkg.version, bin: join(root, rel) };
  } catch {
    return null;
  }
}

/** The nearest `node_modules/@dynshift/layr` from `dir` upwards (the one Node would load there). */
export function resolveProjectLayr(dir: string): LayrInstall | null {
  let d = resolve(dir);
  for (;;) {
    const found = readLayrInstall(join(d, "node_modules", "@dynshift", "layr"));
    if (found) return found;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

/** The `@dynshift/layr` package a module belongs to: walks up from it to that package's root. */
export function ownLayrInstall(moduleDir: string): LayrInstall | null {
  let d = resolve(moduleDir);
  for (let i = 0; i < 6; i++) {
    const found = readLayrInstall(d) ?? readLayrInstall(join(d, "packages", "layr"));
    if (found) return found;
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  return null;
}
