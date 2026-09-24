/** Compiles LAYR in the browser for the runner frame (the compiler loads on first use). */
import type { Diagnostic } from "@dynshift/layr/compiler";

type Compiler = typeof import("@dynshift/layr/compiler");
let compiler: Promise<Compiler> | null = null;

export function loadCompiler(): Promise<Compiler> {
  compiler ??= import("@dynshift/layr/compiler");
  return compiler;
}

export interface Compiled {
  js: string;
  css: string;
  diagnostics: Array<Diagnostic & { line: number; column: number }>;
  errors: number;
}

export async function compile(code: string): Promise<Compiled> {
  const c = await loadCompiler();
  const path = "src/pages/index.layr";
  const r = c.compileProject([{ path, text: code }]);
  const mod = r.modules.get(path);
  const sf = new c.SourceFile(path, code);
  const diagnostics = r.diagnostics.map((d) => ({ ...d, ...sf.position(d.span.start) }));
  return { js: mod?.js ?? "", css: `${r.globalCss}\n${mod?.css ?? ""}`, diagnostics, errors: diagnostics.filter((d) => d.severity === "error").length };
}

export function currentTheme(): string | undefined {
  return document.documentElement.getAttribute("data-theme") ?? undefined;
}

export function decodeCode(b64: string): string {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}
