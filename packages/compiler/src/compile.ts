import { BASE_CSS, REGISTER_PROPERTIES, scaleCss } from "@layr-internal/model";
import { type Graph, ModuleEmitter, newGraph } from "./emit.ts";
import { analyzeProject, DEFAULT_CONFIG, type Project, type ProjectConfig } from "./project.ts";
import type { Diagnostic } from "./source.ts";

export interface ModuleOutput {
  path: string;
  js: string;
  css: string;
  pages: Array<{ name: string; route: string }>;
  widgets: string[];
  diagnostics: Diagnostic[];
}

export interface CompileResult {
  modules: Map<string, ModuleOutput>;
  diagnostics: Diagnostic[];
  graph: Graph;
  project: Project;
  /** Base layout rules + Design Scale variables for the app root. */
  globalCss: string;
}

export function compileProject(files: Array<{ path: string; text: string }>, config: Partial<ProjectConfig> = {}): CompileResult {
  const cfg: ProjectConfig = { ...DEFAULT_CONFIG, ...config, access: { ...DEFAULT_CONFIG.access, ...(config.access ?? {}) } };
  const project = analyzeProject(files, cfg);
  const baseDiagnostics = new Map([...project.modules].map(([p, m]) => [p, [...m.diagnostics]]));

  // Pass 1: discover the E/E/I graph and immutable features.
  const probe = newGraph();
  for (const mod of project.modules.values()) new ModuleEmitter(project, mod, probe).emit();
  const targets = new Set(probe.entries.map((e) => e.address));

  // Pass 2: real emission with the full graph known.
  const graph = newGraph();
  for (const [addr, keys] of probe.immutable) graph.immutable.set(addr, new Set(keys));
  for (const [k, v] of probe.immutableSites) graph.immutableSites.set(k, v);
  const modules = new Map<string, ModuleOutput>();
  for (const mod of project.modules.values()) {
    mod.diagnostics = [...(baseDiagnostics.get(mod.path) ?? [])];
    const em = new ModuleEmitter(project, mod, graph);
    em.preTargets = targets;
    em.pendingImmutable = probe.immutable;
    const r = em.emit();
    modules.set(mod.path, { path: mod.path, ...r, diagnostics: mod.diagnostics });
  }
  checkGraph(project, graph);
  for (const mod of project.modules.values()) {
    const out = modules.get(mod.path);
    if (out) out.diagnostics = dedupe(mod.diagnostics);
  }
  const diagnostics = [...modules.values()].flatMap((m) => m.diagnostics);
  return { modules, diagnostics, graph, project, globalCss: globalCss(cfg) };
}

export function globalCss(cfg: ProjectConfig = DEFAULT_CONFIG): string {
  // Base rules live in a cascade layer so compiled (unlayered) rules always win, whatever the load order.
  return [REGISTER_PROPERTIES, scaleCss(cfg.designScale, { selector: ".l-root" }), scaleCss(cfg.designScale, { selector: ".l-fit-contain", fit: "contain" }), `@layer layr.base {\n${BASE_CSS}\n}`].join("\n");
}

/** Injection ordering checks: equal explicit orders conflict; unordered duplicates warn. */
function checkGraph(project: Project, graph: Graph) {
  const byTarget = new Map<string, typeof graph.entries>();
  for (const e of graph.entries) {
    if (e.kind !== "inject" && e.kind !== "force") continue;
    const k = `${e.address}#${e.key}`;
    const list = byTarget.get(k) ?? [];
    list.push(e);
    byTarget.set(k, list);
  }
  for (const [target, list] of byTarget) {
    const byOrder = new Map<string, typeof list>();
    for (const e of list) {
      const k = e.order === null ? "auto" : String(e.order);
      const l = byOrder.get(k) ?? [];
      l.push(e);
      byOrder.set(k, l);
    }
    for (const [order, same] of byOrder) {
      if (same.length < 2) continue;
      const [first, ...rest] = same;
      for (const e of rest) {
        const mod = project.modules.get(e.file);
        if (!mod || !first) continue;
        const [addr, key] = target.split("#");
        if (order === "auto") {
          mod.diagnostics.push({
            code: "L3103",
            severity: "warning",
            message: `Two Injects without \`.exeOrder\` change \`${key}\` of \`${addr}\`; they apply in file/line order.`,
            span: e.span,
            file: e.file,
            related: [{ message: "Other Inject here.", span: first.span, file: first.file }],
          });
        } else {
          mod.diagnostics.push({
            code: "L3102",
            severity: "error",
            message: `Two Injects change \`${key}\` of \`${addr}\` with the same \`.exeOrder(${order})\`.`,
            span: e.span,
            file: e.file,
            related: [{ message: "Other Inject with the same order.", span: first.span, file: first.file }],
          });
        }
      }
    }
  }
}

function dedupe(list: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  return list.filter((d) => {
    const k = `${d.code}|${d.file}|${d.span.start}|${d.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
