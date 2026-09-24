/** Loads and compiles a LAYR project from disk (used by analyze, format, build checks). */
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { type CompileResult, compileProject, type Diagnostic } from "@layr-internal/compiler";
import { type LoadedConfig, loadConfig, readProjectFiles } from "@layr-internal/node";
import { c, CliError } from "./ui.ts";
import { formatDiagnostic } from "./vite.ts";

export interface LoadedProject {
  root: string;
  config: LoadedConfig;
  files: Array<{ path: string; abs: string; text: string }>;
  result: CompileResult;
}

export function findRoot(start: string): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "layr.yaml"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  if (existsSync(join(resolve(start), "src"))) return resolve(start);
  throw new CliError(`No LAYR project here (no layr.yaml found from ${start}). Create one with ${c.bold("layr create <name>")}.`);
}

export function loadProject(root: string): LoadedProject {
  const config = loadConfig(root);
  const files = readProjectFiles(root, config);
  const result = compileProject(
    files.map((f) => ({ path: f.path, text: f.text })),
    config.project,
  );
  return { root, config, files, result };
}

export function printDiagnostics(p: LoadedProject, list: Diagnostic[] = p.result.diagnostics, includeInfo = false): { errors: number; warnings: number; infos: number } {
  const counts = { errors: 0, warnings: 0, infos: 0 };
  for (const d of list) {
    if (d.severity === "error") counts.errors++;
    else if (d.severity === "warning") counts.warnings++;
    else counts.infos++;
    if (d.severity === "info" && !includeInfo) continue;
    const text = p.files.find((f) => f.path === d.file)?.text ?? "";
    const color = d.severity === "error" ? c.red : d.severity === "warning" ? c.yellow : c.blue;
    const [head, ...rest] = formatDiagnostic(d, text, p.root).split("\n");
    console.log(`${color(head ?? "")}\n${rest.map((l) => c.gray(l)).join("\n")}\n`);
  }
  return counts;
}
