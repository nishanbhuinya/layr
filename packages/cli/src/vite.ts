/**
 * The LAYR Vite plugin. Compiles every `.layr` file as one project (so lookups and injections
 * resolve across files), serves each module's CSS as a virtual module, and provides the app entry.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { type CompileResult, compileProject, type Diagnostic, SourceFile } from "@layr-internal/compiler";
import type { Plugin, ViteDevServer } from "vite";
import { type LoadedConfig, listLayrFiles, loadConfig, projectDirs } from "@layr-internal/node";

export interface LayrPluginOptions {
  /** Project root (defaults to Vite's root). */
  root?: string;
  /** Print diagnostics to the terminal. */
  log?: boolean;
}

const ENTRY = "/@layr/app";
const SSR_ENTRY = "/@layr/ssr";
const GLOBAL_CSS = "\0layr:global.css";
const CSS_PREFIX = "\0layr-css:";

export { listLayrFiles } from "@layr-internal/node";

export function formatDiagnostic(d: Diagnostic, text: string, root: string): string {
  const sf = new SourceFile(d.file ?? "", text);
  const pos = sf.position(d.span.start);
  const line = text.split("\n")[pos.line - 1] ?? "";
  const width = Math.max(1, Math.min(line.length - pos.column + 1, d.span.end - d.span.start));
  const loc = `${d.file ? relative(root, resolve(root, d.file)).replace(/\\/g, "/") : ""}:${pos.line}:${pos.column}`;
  return `${d.severity} ${d.code}: ${d.message}\n  --> ${loc}\n   | ${line}\n   | ${" ".repeat(pos.column - 1)}${"^".repeat(width)}`;
}

export function layr(opts: LayrPluginOptions = {}): Plugin {
  let root = "";
  let cfg: LoadedConfig;
  let result: CompileResult | null = null;
  let server: ViteDevServer | null = null;
  const texts = new Map<string, string>();

  const rel = (abs: string) => relative(root, abs).replace(/\\/g, "/");

  const compileAll = () => {
    cfg = loadConfig(root);
    texts.clear();
    const files = projectDirs(root, cfg).flatMap((d) => listLayrFiles(d)).map((abs) => {
      const text = readFileSync(abs, "utf8");
      texts.set(rel(abs), text);
      return { path: rel(abs), text };
    });
    result = compileProject(files, cfg.project);
    if (opts.log !== false) {
      for (const d of result.diagnostics) {
        if (d.severity === "info") continue;
        const text = texts.get(d.file ?? "") ?? "";
        console.log(formatDiagnostic(d, text, root));
      }
    }
  };

  return {
    name: "layr",
    enforce: "pre",
    configResolved(c) {
      root = opts.root ?? c.root;
      compileAll();
    },
    configureServer(s) {
      server = s;
      const onChange = (file: string) => {
        if (!file.endsWith(".layr") && !file.endsWith("layr.yaml")) return;
        compileAll();
        s.moduleGraph.invalidateAll();
        s.ws.send({ type: "full-reload" });
      };
      s.watcher.on("add", onChange);
      s.watcher.on("unlink", onChange);
    },
    configurePreviewServer(server) {
      // Serve prerendered routes like static hosts do: /forms → /forms/index.html.
      const outDir = resolve(root, server.config.build.outDir);
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? "/";
        const path = url.split("?")[0] as string;
        if (!path.includes(".") && path !== "/") {
          const candidate = join(outDir, path, "index.html");
          if (existsSync(candidate)) req.url = `${path.replace(/\/$/, "")}/index.html${url.slice(path.length)}`;
        }
        next();
      });
    },
    handleHotUpdate(ctx) {
      if (!ctx.file.endsWith(".layr") && !ctx.file.endsWith("layr.yaml")) return;
      compileAll();
      ctx.server.moduleGraph.invalidateAll();
      ctx.server.ws.send({ type: "full-reload" });
      return [];
    },
    resolveId(id, importer) {
      if (id === ENTRY || id === "virtual:layr/app") return "\0layr:app";
      if (id === SSR_ENTRY || id === "virtual:layr/ssr") return "\0layr:ssr";
      if (id === "virtual:layr/global.css") return GLOBAL_CSS;
      if (id.startsWith("virtual:layr-css:")) return `${CSS_PREFIX}${id.slice("virtual:layr-css:".length)}`;
      if (id.endsWith(".layr") && importer && !id.startsWith("\0")) {
        if (id.startsWith(".")) return resolve(importer.replace(/^\0/, "").split("?")[0] as string, "..", id);
        if (id.startsWith("/")) return resolve(root, `.${id}`);
      }
      return null;
    },
    load(id) {
      if (id === "\0layr:app") {
        const hasApp = !!cfg.appFile;
        return [
          `import "virtual:layr/global.css";`,
          `import { mount } from "@dynshift/layr/react";`,
          hasApp ? `import * as $appModule from "/src/app.layr";` : "const $appModule = {};",
          cfg.isAddon ? `import.meta.glob("/examples/*.layr", { eager: true });` : `import.meta.glob("/src/pages/**/*.layr", { eager: true });`,
          `mount(document.getElementById("app"), { ...($appModule.$app ?? {}), base: import.meta.env.BASE_URL });`,
        ].join("\n");
      }
      if (id === "\0layr:ssr") {
        const hasApp = !!cfg.appFile;
        return [
          `import { renderPage } from "@dynshift/layr/ssr";`,
          hasApp ? `import * as $appModule from "/src/app.layr";` : "const $appModule = {};",
          cfg.isAddon ? `import.meta.glob("/examples/*.layr", { eager: true });` : `import.meta.glob("/src/pages/**/*.layr", { eager: true });`,
          `export function render(url, data) { return renderPage(url, { ...($appModule.$app ?? {}) }, data); }`,
          `export { routes, prerenderRoutes, loadData } from "@dynshift/layr/ssr";`,
        ].join("\n");
      }
      if (id === GLOBAL_CSS) return result?.globalCss ?? "";
      if (id.startsWith(CSS_PREFIX)) {
        const path = id.slice(CSS_PREFIX.length).replace(/\.css$/, "");
        return result?.modules.get(path)?.css ?? "";
      }
      const file = id.split("?")[0] as string;
      if (!file.endsWith(".layr")) return null;
      if (!result) compileAll();
      const path = rel(file);
      const out = result?.modules.get(path);
      if (!out) {
        // A file outside src/ (or newly created): compile it on its own.
        compileAll();
      }
      const mod = result?.modules.get(path);
      if (!mod) throw new Error(`LAYR: ${path} is not part of the project (src/**/*.layr, examples/ in addons, and installed addons are compiled).`);
      const errors = mod.diagnostics.filter((d) => d.severity === "error");
      if (errors.length) {
        const text = texts.get(path) ?? "";
        const first = errors[0] as Diagnostic;
        const pos = new SourceFile(path, text).position(first.span.start);
        const err = new Error(errors.map((d) => formatDiagnostic(d, text, root)).join("\n\n")) as Error & { loc?: unknown; id?: string };
        err.loc = { file, line: pos.line, column: pos.column };
        err.id = file;
        throw err;
      }
      return `import "virtual:layr-css:${path}.css";\n${mod.js}`;
    },
    api: {
      result: () => result,
      server: () => server,
    },
  };
}

export default layr;
