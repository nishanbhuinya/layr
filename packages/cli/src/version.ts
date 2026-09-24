import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The version of the installed `@dynshift/layr` package. */
export function layrVersion(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidates = [join(dir, "package.json"), join(dir, "packages", "layr", "package.json")];
    for (const p of candidates) {
      if (!existsSync(p)) continue;
      const pkg = JSON.parse(readFileSync(p, "utf8")) as { name?: string; version?: string };
      if (pkg.name === "@dynshift/layr" && pkg.version) return pkg.version;
    }
    dir = dirname(dir);
  }
  return "3.0.0";
}
