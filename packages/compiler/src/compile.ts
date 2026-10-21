import { BASE_CSS, REGISTER_PROPERTIES, scaleCss } from "@layr-internal/model";
import { type Graph, type GraphEntry, ModuleEmitter, newGraph, themeCss } from "./emit.ts";
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
  const targets = new Set([...probe.entries.map((e) => e.address), ...probe.via]);
  const reads = new Set(probe.entries.filter((e) => e.kind === "extract" || e.kind === "read").map((e) => `${e.address}#${e.key}`));

  // Pass 2: real emission with the full graph known.
  const graph = newGraph();
  for (const [addr, keys] of probe.immutable) graph.immutable.set(addr, new Set(keys));
  for (const [k, v] of probe.immutableSites) graph.immutableSites.set(k, v);
  const modules = new Map<string, ModuleOutput>();
  for (const mod of project.modules.values()) {
    mod.diagnostics = [...(baseDiagnostics.get(mod.path) ?? [])];
    const em = new ModuleEmitter(project, mod, graph);
    em.preTargets = targets;
    em.preReads = reads;
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
  // The theme's variables come with the App. A project compiled with a theme but no App (a snippet, a
  // test, an editor preview) still gets them, or its theme colours would resolve to nothing.
  const hasApp = [...project.modules.values()].some((m) => m.app);
  const theme = hasApp ? "" : themeCss(cfg.theme);
  return { modules, diagnostics, graph, project, globalCss: theme ? `${globalCss(cfg)}\n${theme}` : globalCss(cfg) };
}

export function globalCss(cfg: ProjectConfig = DEFAULT_CONFIG): string {
  // Base rules live in a cascade layer so compiled (unlayered) rules always win, whatever the load order.
  return [REGISTER_PROPERTIES, scaleCss(cfg.designScale, { selector: ".l-root" }), scaleCss(cfg.designScale, { selector: ".l-fit-contain", fit: "contain" }), `@layer layr.base {\n${BASE_CSS}\n}`].join("\n");
}

/**
 * The exeOrder chain of each object: every Export, Extract, Inject and Duplicate on an object takes its
 * own order (L3102), and at most one Inject on it has none (L3103). One op can touch several of an
 * object's features at its one order; ops on different objects may share numbers.
 */
function checkGraph(project: Project, graph: Graph) {
  const byTarget = new Map<string, Map<string, GraphEntry>>();
  for (const e of graph.entries) {
    if (!e.op) continue;
    const ops = byTarget.get(e.address) ?? new Map<string, GraphEntry>();
    if (!ops.has(e.op)) ops.set(e.op, e);
    byTarget.set(e.address, ops);
  }
  for (const [address, ops] of byTarget) {
    const name = `\`${address.replace("::", ".").replace(/>/g, ".")}\``;
    const used = new Set([...ops.values()].flatMap((e) => (e.order === null ? [] : [e.order])));
    const byOrder = new Map<string, GraphEntry[]>();
    for (const e of ops.values()) {
      if (e.order !== null) byOrder.set(String(e.order), [...(byOrder.get(String(e.order)) ?? []), e]);
    }
    // Unordered Injects have no number to share; two of them changing the same feature conflict.
    const unordered = new Map<string, GraphEntry>();
    for (const e of graph.entries) {
      if (e.address !== address || e.order !== null || (e.kind !== "inject" && e.kind !== "force") || !e.op) continue;
      unordered.set(`${e.key}|${e.op}`, e);
    }
    const byKey = new Map<string, GraphEntry[]>();
    for (const e of unordered.values()) byKey.set(e.key, [...(byKey.get(e.key) ?? []), e]);
    for (const list of byKey.values()) if (list.length > 1) byOrder.set(`auto:${list[0]?.key}`, list);
    for (const [order, same] of byOrder) {
      const [first, ...rest] = same.sort((a, b) => a.file.localeCompare(b.file) || a.span.start - b.span.start);
      for (const e of rest) {
        const mod = project.modules.get(e.file);
        if (!mod || !first) continue;
        const auto = order.startsWith("auto:");
        const related = [{ message: `${first.opKind ?? "Operation"} on the same object${auto ? " without an order" : ` at .exeOrder(${order})`}.`, span: first.span, file: first.file }];
        if (auto) {
          mod.diagnostics.push({ code: "L3103", severity: "error", message: `Two Injects without \`.exeOrder\` change \`${e.key}\` of ${name}; give one of them an order so the chain says which comes first.`, span: e.span, file: e.file, related });
          continue;
        }
        let free = Number(order) + 1;
        while (used.has(free)) free++;
        used.add(free);
        const written = e.orderSpan ? mod.source.text.slice(e.orderSpan.start, e.orderSpan.end) : "";
        const sign = free > 0 && written.trim().startsWith("+") ? "+" : "";
        const a = (k?: string) => (k === "Duplicate" ? "a Duplicate" : `an ${k ?? "operation"}`);
        const who = e.opKind === first.opKind ? `Two ${e.opKind ?? "operation"}s` : `This ${e.opKind ?? "operation"} and ${a(first.opKind)}`;
        mod.diagnostics.push({
          code: "L3102",
          severity: "error",
          message: `${who} on ${name} share \`.exeOrder(${written.trim() || order})\`. On one object every operation takes its own order; ${sign}${free} is free.`,
          span: e.orderSpan ?? e.span,
          file: e.file,
          related,
          ...(e.orderSpan ? { fixes: [{ title: `Use .exeOrder(${sign}${free})`, edits: [{ span: e.orderSpan, text: `${sign}${free}` }] }] } : {}),
        });
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
