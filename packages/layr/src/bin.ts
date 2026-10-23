#!/usr/bin/env node
/**
 * The `layr` executable. Inside a project it runs that project's own `@dynshift/layr`, so a global
 * install (`npm i -g @dynshift/layr`) is typed as plain `layr` and still builds, checks and serves
 * with the version the project depends on. `create` (there is no project yet), `--version` and the
 * package step of `upgrade` run in this copy; `LAYR_NO_LOCAL=1` runs everything in this copy.
 */
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { type LayrInstall, ownLayrInstall, resolveProjectLayr } from "@layr-internal/cli/install";

const argv = process.argv.slice(2);

function projectLayr(): LayrInstall | null {
  if (process.env.LAYR_NO_LOCAL || process.env.LAYR_DEFERRED) return null;
  const command = argv.find((a) => !a.startsWith("-"));
  if (command === "create" || command === "version" || (!command && (argv.includes("--version") || argv.includes("-v")))) return null;
  if (command === "upgrade" && !argv.includes("--code")) return null;
  const local = resolveProjectLayr(process.cwd());
  if (!local) return null;
  const own = ownLayrInstall(dirname(fileURLToPath(import.meta.url)));
  return own && own.root === local.root ? null : local;
}

const local = projectLayr();
if (local) {
  process.env.LAYR_DEFERRED = local.version;
  await import(pathToFileURL(local.bin).href);
} else {
  const { main } = await import("@layr-internal/cli");
  main(argv).then(
    (code) => {
      if (code !== null) process.exit(code);
    },
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
