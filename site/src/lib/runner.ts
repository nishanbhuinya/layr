/** Compiles LAYR in the browser for the runner frame (the compiler loads on first use). */
import type { Diagnostic } from "@dynshift/layr/compiler";

type Compiler = typeof import("@dynshift/layr/compiler");
let compiler: Promise<Compiler> | null = null;

export function loadCompiler(): Promise<Compiler> {
  compiler ??= import("@dynshift/layr/compiler");
  return compiler;
}

interface AddonSources {
  addons: Record<string, string>;
  files: Array<{ path: string; text: string }>;
}
let addonSources: Promise<AddonSources> | null = null;
/** An import of an official addon; its sources load only for code that asks for one. */
const ADDON_IMPORT = /from\s*['"]@dynshift\/layr-[\w-]+['"]/;

export interface Compiled {
  js: string;
  css: string;
  /** Other modules the page imports (installed addons), by project path, for the runner to link. */
  modules: Array<{ path: string; js: string }>;
  /** Import specifier → project path (an addon's npm name → its entry file). */
  aliases: Record<string, string>;
  diagnostics: Array<Diagnostic & { line: number; column: number }>;
  errors: number;
}

/**
 * Compiles one file as a whole project. A file may carry its own `App(.theme(...) .scale(...))`,
 * which then configures it the way `src/app.layr` configures a project. `inspect` puts lookup paths
 * and source lines on every element (for the home page's inspector).
 */
export async function compile(code: string, opts: { inspect?: boolean; app?: string } = {}): Promise<Compiled> {
  const c = await loadCompiler();
  const src: AddonSources = ADDON_IMPORT.test(code) ? await (addonSources ??= import("virtual:site/addons-src").then((m) => m.default as AddonSources)) : { addons: {}, files: [] };
  const path = "src/pages/index.layr";
  const app = opts.app ? c.readAppConfig(opts.app) : /\b(App|Theme|DesignScale)\s*\(/.test(code) ? c.readAppConfig(code, path) : null;
  const r = c.compileProject([{ path, text: code }, ...src.files], { addons: src.addons, inspect: opts.inspect, ...(app ? { theme: app.theme, designScale: app.designScale } : {}) });
  const mod = r.modules.get(path);
  const sf = new c.SourceFile(path, code);
  // Only the reader's own code has problems worth listing; addon sources are known to compile.
  const diagnostics = r.diagnostics.filter((d) => !d.file || d.file === path).map((d) => ({ ...d, ...sf.position(d.span.start) }));
  const modules = src.files.map((f) => ({ path: f.path, js: r.modules.get(f.path)?.js ?? "" }));
  const css = [r.globalCss, ...src.files.map((f) => r.modules.get(f.path)?.css ?? ""), mod?.css ?? ""].join("\n");
  return { js: mod?.js ?? "", css, modules, aliases: src.addons, diagnostics, errors: diagnostics.filter((d) => d.severity === "error").length };
}

export function currentTheme(): string | undefined {
  return document.documentElement.getAttribute("data-theme") ?? undefined;
}

export function decodeCode(b64: string): string {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}
