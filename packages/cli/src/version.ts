import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ownLayrInstall, resolveProjectLayr } from "@layr-internal/node/install";

/** The version of the `@dynshift/layr` package this CLI belongs to. */
export function layrVersion(): string {
  return ownLayrInstall(dirname(fileURLToPath(import.meta.url)))?.version ?? "3";
}

/** The `@dynshift/layr` version the project in `dir` installs, when it has one. */
export function projectLayrVersion(dir = process.cwd()): string | null {
  return resolveProjectLayr(dir)?.version ?? null;
}
