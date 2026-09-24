/**
 * Code generation for the React target: one ES module (+ CSS) per `.layr` file.
 */
import {
  ALIGN_ALL,
  AXIS_VALUES,
  all,
  arith,
  border,
  Color,
  canonicalAlign,
  declsCss,
  ease,
  gradient,
  type KeyDef,
  keyOf,
  type LowerContext,
  lower,
  NAMED_COLORS,
  namedColor,
  only,
  pct,
  px,
  shadow,
  size as sizeValue,
  spring,
  scaleCss,
  sym,
  vp,
  type WidgetDef,
  widget,
  fr,
} from "@layr-internal/model";
import type { Block, Call, Expr, Item, Modifier, Prop, StringLit } from "./ast.ts";
import { designScaleFrom } from "./app.ts";
import { BUILTIN_ALIASES, COLOR_METHOD_ALIASES, NAMESPACES, RENDERED_FEATURES, suggest, VALUE_BUILTINS } from "./names.ts";
import {
  type CompDef,
  type ConfigEntry,
  type EEIDef,
  exprItems,
  type FunctionDef,
  firstModifier,
  identName,
  type Module,
  type ObjNode,
  type Project,
  report,
  lookupPath,
  runtimeAddress,
} from "./project.ts";
import type { Span } from "./source.ts";
import { rewriteBody } from "./tsbody.ts";

// ------------------------------------------------------------------ graph

export interface GraphEntry {
  kind: "read" | "write" | "inject" | "extract" | "force";
  address: string;
  key: string;
  order: number | null;
  file: string;
  span: Span;
  owner: string | null;
}

export interface Graph {
  entries: GraphEntry[];
  /** address → immutable feature keys (`!mut`). */
  immutable: Map<string, Set<string>>;
  /** address → declaration site of each immutable key. */
  immutableSites: Map<string, { file: string; span: Span }>;
}

export function newGraph(): Graph {
  return { entries: [], immutable: new Map(), immutableSites: new Map() };
}

// ------------------------------------------------------------------ scope

type Binding =
  | { kind: "signal"; code: string; type: string | null; immutable?: boolean; address?: string }
  | { kind: "computed"; code: string; type: string | null }
  | { kind: "value"; code: string; type: string | null }
  | { kind: "object"; node: ObjNode; comp: CompDef }
  | { kind: "function"; fn: FunctionDef; code: string }
  | { kind: "comp"; comp: CompDef; code: string }
  | { kind: "params"; comp: CompDef }
  | { kind: "group"; members: Map<string, { address: string; key: string; node: ObjNode | null }> };

class Scope {
  readonly map = new Map<string, Binding>();
  readonly parent: Scope | null;
  constructor(parent: Scope | null) {
    this.parent = parent;
  }
  lookup(name: string): Binding | null {
    return this.map.get(name) ?? this.parent?.lookup(name) ?? null;
  }
  set(name: string, b: Binding) {
    this.map.set(name, b);
  }
}

export interface Gen {
  code: string;
  type: string;
  /** Compile-time value when the expression is constant. */
  konst?: unknown;
}

const NOT_CONST = Symbol("not-const");

interface Expect {
  type?: string;
  values?: readonly string[];
}

// ------------------------------------------------------------------ module emitter

export interface EmitResult {
  js: string;
  css: string;
  pages: Array<{ name: string; route: string }>;
  widgets: string[];
}

export class ModuleEmitter {
  readonly project: Project;
  readonly mod: Module;
  readonly graph: Graph;
  private readonly cssRules = new Map<string, string>();
  private readonly lowerCtx: LowerContext;
  private readonly moduleScope: Scope;
  private tmp = 0;
  private readonly hoisted: string[] = [];
  private readonly hoistedByKey = new Map<string, string>();
  /** Current `$ctx` availability (inside actions). */
  private inAction = false;
  private currentComp: CompDef | null = null;

  constructor(project: Project, mod: Module, graph: Graph) {
    this.project = project;
    this.mod = mod;
    this.graph = graph;
    this.lowerCtx = { frames: new Map(project.config.designScale.frames.map((f) => [f.name, { from: f.from, w: f.w }])) };
    this.moduleScope = new Scope(null);
  }

  private err(code: string, message: string, span: Span, severity: "error" | "warning" | "info" = "error") {
    report(this.mod, code, message, span, severity);
  }

  /** A constant colour as hoisted JS: hex for plain colours, the full value for theme colours. */
  private colorCode(c: Color): string {
    if (c.css === null) return this.hoist(`c:${c.toCss()}`, `$V.Color.hex(${JSON.stringify(c.toCss())})`);
    return this.hoist(`c:${c.css}:${c.r},${c.g},${c.b},${c.a}`, `new $V.Color(${c.r}, ${c.g}, ${c.b}, ${c.a}, ${JSON.stringify(c.css)})`);
  }

  private hoist(key: string, code: string): string {
    const existing = this.hoistedByKey.get(key);
    if (existing) return existing;
    const name = `$k${this.hoisted.length}`;
    this.hoisted.push(`const ${name} = ${code};`);
    this.hoistedByKey.set(key, name);
    return name;
  }

  // -------------------------------------------------------------- entry

  emit(): EmitResult {
    const out: string[] = [];
    const pages: EmitResult["pages"] = [];
    const widgets: string[] = [];
    const mod = this.mod;

    // Imports
    out.push(`import { jsx as $j, jsxs as $js, Fragment as $Fr } from "react/jsx-runtime";`);
    out.push(`import * as $ from ${JSON.stringify(this.project.config.runtime)};`);
    out.push(`import * as $V from ${JSON.stringify(this.project.config.values)};`);
    for (const imp of mod.imports) {
      const parts: string[] = [];
      if (imp.defaultName) parts.push(imp.defaultName);
      if (imp.namespace) parts.push(`* as ${imp.namespace}`);
      if (imp.named.length) parts.push(`{ ${imp.named.map((n) => (n.name === n.alias ? n.name : `${n.name} as ${n.alias}`)).join(", ")} }`);
      if (imp.typeOnly) continue;
      out.push(parts.length ? `import ${parts.join(", ")} from ${JSON.stringify(imp.source)};` : `import ${JSON.stringify(imp.source)};`);
    }

    // Module scope: imports, comps, functions, state.
    for (const [local, info] of mod.foreign) this.moduleScope.set(local, { kind: "value", code: local, type: null });
    for (const [local, ref] of mod.layrImports) {
      const c = this.project.modules.get(ref.module)?.comps.find((x) => x.name === ref.name);
      if (c) this.moduleScope.set(local, { kind: "comp", comp: c, code: local });
    }
    for (const c of mod.comps) this.moduleScope.set(c.name, { kind: "comp", comp: c, code: c.name });
    for (const fn of mod.functions) this.moduleScope.set(fn.name, { kind: "function", fn, code: fn.name });
    for (const s of mod.state) this.moduleScope.set(s.name, stateBinding(s.kind, s.name, s.type, s.immutable));

    const body: string[] = [];
    // File-level state (app-global signals).
    for (const s of mod.state) body.push(this.emitState(s, this.moduleScope));
    // File-level functions.
    for (const fn of mod.functions) body.push(this.emitFunction(fn, this.moduleScope));
    // File-level Extract/Inject/Export.
    for (const e of mod.eei) body.push(this.emitEEI(e, this.moduleScope, "module"));

    for (const comp of mod.comps) {
      body.push(this.emitComp(comp));
      if (comp.kind === "page") {
        pages.push({ name: comp.name, route: comp.route ?? defaultRoute(mod.path, comp.name) });
      } else widgets.push(comp.name);
    }
    for (const comp of mod.comps) {
      if (comp.kind === "page") {
        // Metadata may read the route and the loaded data (`.meta(title: data.title)`).
        const metaScope = new Scope(this.moduleScope);
        metaScope.set("route", { kind: "value", code: "$route", type: null });
        metaScope.set("data", { kind: "value", code: "$data", type: null });
        const meta = comp.meta.map((p) => `${JSON.stringify(p.key)}: ${this.expr(p.value, metaScope).code}`).join(", ");
        const route = comp.route ?? defaultRoute(mod.path, comp.name);
        const extra = `${comp.load ? `, load: ${this.emitLoad(comp)}` : ""}${comp.paths ? `, paths: ${this.emitBlockFn(comp.paths)}` : ""}`;
        body.push(`$.page({ name: ${JSON.stringify(comp.name)}, route: ${JSON.stringify(route)}, component: ${comp.name}, meta: ($route, $data) => ({ ${meta} })${extra} });`);
      }
    }
    for (const p of mod.presets) body.push(this.emitPreset(p));
    if (mod.app) body.push(this.emitApp(mod.app));
    const def = mod.comps.find((c) => c.anonymous) ?? (mod.comps.length === 1 ? mod.comps[0] : undefined);
    if (def) body.push(`export default ${def.name};`);

    // Immutable table for runtime enforcement.
    const imm: string[] = [];
    for (const comp of mod.comps) {
      const walkImm = (n: ObjNode | null) => {
        if (!n) return;
        const keys = n.config.filter((e) => e.immutable).map((e) => canonicalKey(n, e.key));
        if (keys.length) imm.push(`${JSON.stringify(runtimeAddress(comp, n))}: ${JSON.stringify(keys)}`);
        for (const list of n.children.values()) for (const ch of list) if (ch.kind === "node") walkImm(ch.node);
      };
      walkImm(comp.root);
    }
    if (imm.length) body.unshift(`$.immutable({ ${imm.join(", ")} });`);

    out.push(...this.hoisted, ...body);
    const css = [...this.cssRules.values()].join("\n");
    return { js: `${out.join("\n")}\n`, css, pages, widgets };
  }

  private emitPreset(call: Call): string {
    const name = identName(exprItems(firstModifier(call.items, "name")?.items ?? null)[0]);
    const forName = identName(exprItems(firstModifier(call.items, "for")?.items ?? null)[0]);
    const def = forName ? widget(forName) : undefined;
    if (!name || !def) {
      this.err("L1008", "A Preset needs `.name(...)` and `.for(Widget)`.", call.span);
      return "";
    }
    const cfg = (firstModifier(call.items, "config")?.items ?? []).filter((i): i is Prop => i.type === "Prop");
    const entries = cfg.map((p) => {
      const k = keyOf(def, p.key);
      if (!k) this.err("L1002", `\`${def.name}\` has no config key \`${p.key}\`.`, p.keySpan);
      return `${JSON.stringify(k?.name ?? p.key)}: ${this.expr(p.value, this.moduleScope, k ? { type: k.type, values: k.values } : {}).code}`;
    });
    return `$.preset(${JSON.stringify(def.name)}, ${JSON.stringify(name)}, { ${entries.join(", ")} });`;
  }

  private emitApp(call: Call): string {
    const parts: string[] = [`scale: ${JSON.stringify(this.project.config.designScale)}`];
    const prov = firstModifier(call.items, "providers");
    if (prov) {
      const list = exprItems(prov.items).map((e) => {
        if (e.type !== "Call") return "null";
        const comp = this.expr(e.callee, this.moduleScope).code;
        const p = (firstModifier(e.items, "props")?.items ?? []).filter((i): i is Prop => i.type === "Prop").map((x) => `${JSON.stringify(x.key)}: ${this.expr(x.value, this.moduleScope).code}`);
        return `{ component: ${comp}, props: { ${p.join(", ")} } }`;
      });
      parts.push(`providers: [${list.join(", ")}]`);
    }
    const meta = (firstModifier(call.items, "meta")?.items ?? []).filter((i): i is Prop => i.type === "Prop");
    for (const m of meta) parts.push(`${JSON.stringify(m.key)}: ${this.expr(m.value, this.moduleScope).code}`);
    const theme = this.project.config.theme;
    const vars = Object.entries(theme.colors).map(([k, v]) => `--layr-color-${k}:${v}`);
    const fallback = (k: string) => (k === "code" ? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" : "system-ui, sans-serif");
    for (const [k, v] of Object.entries(theme.fonts)) vars.push(`--layr-font-${k}:"${v}", ${fallback(k)}`);
    if (theme.fonts.body) vars.push("font-family:var(--layr-font-body)");
    const rules: string[] = [];
    if (vars.length) rules.push(`.l-root{${vars.join(";")}}`);
    // `.dark(...)` follows the system setting unless the page pins data-theme on <html>.
    const dark = Object.entries(theme.dark).map(([k, v]) => `--layr-color-${k}:${v}`).join(";");
    if (dark) rules.push(`@media (prefers-color-scheme: dark){:root:not([data-theme=light]) .l-root{${dark};color-scheme:dark}}`, `:root[data-theme=dark] .l-root{${dark};color-scheme:dark}`);
    if (rules.length) this.cssRules.set("theme", rules.join("\n"));
    return `export const $app = { ${parts.join(", ")} };`;
  }

  private emitLoad(comp: CompDef): string {
    const sc = new Scope(this.moduleScope);
    sc.set("route", { kind: "value", code: "$route", type: null });
    const r = rewriteBody((comp.load as Block).code, bodyScope(sc));
    for (const e of r.errors) this.err("L0014", `TypeScript: ${e.message}`, spanAt(comp.load as Block, e.offset));
    return `async ($route) => { ${r.code} }`;
  }

  /** A page-level TS block with no inputs (`.paths { return [...] }`). */
  private emitBlockFn(block: Block): string {
    const r = rewriteBody(block.code, bodyScope(new Scope(this.moduleScope)));
    for (const e of r.errors) this.err("L0014", `TypeScript: ${e.message}`, spanAt(block, e.offset));
    return `async () => { ${r.code} }`;
  }

  // -------------------------------------------------------------- state and functions

  private emitState(s: { name: string; kind: "var" | "const" | "bind"; type: string | null; init: Expr | null; decl: { span: Span } }, sc: Scope): string {
    const expect: Expect = s.type ? { type: normalizeType(s.type) } : {};
    const init = s.init ? this.expr(s.init, sc, expect).code : s.type ? defaultFor(s.type) : "undefined";
    if (s.kind === "var") return `const ${s.name} = $.signal(${init});`;
    if (s.kind === "bind") return `const ${s.name} = $.computed(() => ${init});`;
    return `const ${s.name} = ${init};`;
  }

  private emitFunction(fn: FunctionDef, sc: Scope): string {
    const fsc = new Scope(sc);
    const params: string[] = ["$ctx"];
    for (const p of fn.params) {
      params.push(p.init && !p.ref ? `${p.name} = ${this.expr(p.init, sc, { type: p.type ? normalizeType(p.type) : undefined }).code}` : p.name);
      fsc.set(p.name, p.ref ? { kind: "signal", code: p.name, type: p.type } : { kind: "value", code: p.name, type: p.type });
    }
    const body = fn.body ? this.action(fn.body.items, fn.body.block, fsc) : "";
    return `async function ${fn.name}(${params.join(", ")}) {\n${body}\n}`;
  }

  // -------------------------------------------------------------- components

  private emitComp(comp: CompDef): string {
    this.currentComp = comp;
    const sc = new Scope(this.moduleScope);
    const lines: string[] = [];
    const pre: string[] = [];
    for (const [id, node] of comp.ids) sc.set(id, { kind: "object", node, comp });
    for (const [group, members] of comp.exportGroups) {
      const m = new Map([...members].map(([name, v]) => [name, { address: runtimeAddress(comp, v.node), key: v.key, node: v.node }] as const));
      sc.set(group, { kind: "group", members: m });
      this.moduleScope.set(group, { kind: "group", members: m });
    }
    if (comp.kind === "widget") {
      sc.set("param", { kind: "params", comp });
      // emit('close', value): raise an event the widget's caller handles with .on(close: ...).
      sc.set("emit", { kind: "value", code: "((n, ...a) => $.run($p.$on?.[n], a))", type: "fn" });
    }

    // State
    const stateNames = comp.state.map((s) => s.name);
    for (const s of comp.state) sc.set(s.name, stateBinding(s.kind, s.name, s.type, s.immutable));
    if (comp.state.length) {
      const factory = `() => {\n${comp.state.map((s) => this.emitState(s, sc)).join("\n")}\nreturn { ${stateNames.join(", ")} };\n}`;
      if (comp.kind === "page" && comp.stateMode === "keep") {
        pre.push(`const $store_${comp.name} = $.pageStore(${JSON.stringify(comp.name)}, ${factory});`);
        lines.push(`const { ${stateNames.join(", ")} } = $store_${comp.name}();`);
      } else lines.push(`const { ${stateNames.join(", ")} } = $.useInstance(${factory});`);
    }
    if (comp.kind === "widget") {
      const defaults = comp.params
        .filter((p) => p.init)
        .map((p) => `${JSON.stringify(p.name)}: ${this.expr(p.init as Expr, this.moduleScope, { type: p.type ? normalizeType(p.type) : undefined }).code}`);
      if (defaults.length) lines.push(`$p = $.params($p, { ${defaults.join(", ")} });`);
    }
    if (comp.kind === "page") {
      lines.push("const $route = $.useRoute();");
      sc.set("route", { kind: "value", code: "$route", type: null });
      sc.set("data", { kind: "value", code: "$p.$data", type: null });
    }

    // React hooks block
    if (comp.react) {
      const r = rewriteBody(comp.react.code, bodyScope(sc));
      for (const e of r.errors) this.err("L0014", `TypeScript: ${e.message}`, spanAt(comp.react, e.offset));
      lines.push(r.code);
      for (const name of declaredNames(comp.react.code)) sc.set(name, { kind: "value", code: name, type: null });
      if (!this.project.config.targets.every((t) => t === "react")) this.err("L9001", "`.react { }` runs only on the React target.", comp.react.span, "info");
    }
    // Functions (closures over state and params)
    for (const fn of comp.functions) sc.set(fn.name, { kind: "function", fn, code: fn.name });
    for (const fn of comp.functions) lines.push(this.emitFunction(fn, sc));
    // Extract / Inject / Export
    for (const e of comp.eei) lines.push(this.emitEEI(e, sc, "component"));

    const root = comp.root ? this.node(comp.root, sc, comp) : "null";
    this.currentComp = null;
    const addrProp = comp.kind === "widget" ? "" : "";
    return `${pre.join("\n")}
export function ${comp.name}($p) {${addrProp}
const $t = $.useTrack();
try {
${lines.join("\n")}
return ${root};
} finally { $t.done(); }
}
${comp.name}.displayName = ${JSON.stringify(comp.name)};`;
  }

  // -------------------------------------------------------------- nodes

  private nodeDef(n: ObjNode): WidgetDef | null {
    return n.def;
  }

  private node(n: ObjNode, sc: Scope, comp: CompDef): string {
    if (n.kind === "construct") return this.construct(n, sc, comp);
    if (n.kind === "foreign") return this.foreign(n, sc, comp);
    if (n.kind === "user") return this.userNode(n, sc, comp);
    const def = n.def as WidgetDef;
    const props: string[] = [`w: ${JSON.stringify(def.name)}`];

    // Config: static vs dynamic.
    const { staticCfg, dynamic, keysSeen } = this.config(n, def, sc);
    const atStatic = this.atConfig(n, def, sc, dynamic);
    const addressable = this.isAddressable(n);
    const allStatic = Object.keys(dynamic).length === 0;

    // Presets
    const presets = (n.modifiers.get("preset") ?? []).flatMap((m) => exprItems(m.items).map((e) => identName(e) ?? ""));
    if (presets.length) props.push(`pr: ${JSON.stringify(presets)}`);

    if (allStatic) {
      const l = lower(def.name, { ...staticCfg, ...atStatic.base }, this.lowerCtx);
      const cls = this.cssClass(l.decls, l.media.concat(atStatic.media));
      const classes = [...new Set([...l.classes, ...(cls ? [cls] : [])])];
      props.push(`c: ${JSON.stringify(classes.join(" "))}`);
      if (l.tag !== def.tag) props.push(`t: ${JSON.stringify(l.tag)}`);
      const attrs = Object.entries(l.attrs);
      if (attrs.length) props.push(`x: ${JSON.stringify(Object.fromEntries(attrs))}`);
      const behaviour = Object.entries(staticCfg).filter(([k]) => BEHAVIOUR_KEYS.has(k)).sort((x, y) => (x[0] < y[0] ? -1 : 1));
      if (behaviour.length) props.push(`b: { ${behaviour.map(([k, v]) => `${JSON.stringify(k)}: ${this.constCode(v)}`).join(", ")} }`);
      if (l.notes.includes("adapt-row")) {
        if (this.rowHasFill(n)) props.push("ad: 1");
        else props[props.findIndex((p) => p.startsWith("c: "))] = `c: ${JSON.stringify(`${classes.join(" ")} l-wrap-auto`)}`;
      }
    } else {
      // Media parts that are fully static still compile to CSS.
      const cls = this.cssClass({}, atStatic.media);
      if (cls) props.push(`c: ${JSON.stringify(cls)}`);
      const entries = [...Object.entries(staticCfg).map(([k, v]) => [k, this.constCode(v)] as const), ...Object.entries(dynamic)]
        .sort((x, y) => (x[0] < y[0] ? -1 : 1))
        .map(([k, v]) => `${JSON.stringify(k)}: ${v}`);
      props.push(`d: { ${entries.join(", ")} }`);
    }
    if (addressable) {
      props.push(`a: ${JSON.stringify(runtimeAddress(comp, n))}`);
      if (allStatic) props.push(`s: { ${Object.entries(staticCfg).sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([k, v]) => `${JSON.stringify(k)}: ${this.constCode(v)}`).join(", ")} }`);
      if (comp.kind === "widget") props.push("ip: $p.$a");
    }
    if (n === comp.root && comp.kind === "widget") props.push("o: $p.$o", "oe: $p.$on");
    if (this.project.config.inspect) props.push(`p: ${JSON.stringify(lookupPath(comp, n))}`, `ln: ${this.mod.source.position(n.call.span.start).line}`);
    void keysSeen;

    // Events
    const events = this.events(n, def, sc);
    if (events) props.push(`on: ${events}`);
    const a11y = firstModifier(n.call.items, "a11y");
    if (a11y) props.push(`ar: { ${(a11y.items ?? []).filter((i): i is Prop => i.type === "Prop").map((p) => `${JSON.stringify(p.key)}: ${this.expr(p.value, sc).code}`).join(", ")} }`);
    if (def.name === "Animate") props.push(`m: ${this.motion(n, sc)}`);

    // Accessibility checks
    this.a11yChecks(n, def, staticCfg, dynamic);

    // Children
    let staticList = false;
    for (const slot of def.slots) {
      const list = n.children.get(slot.name) ?? [];
      if (!list.length) {
        if (slot.required && def.name !== "Text") this.err("L1008", `\`${def.name}\` needs \`.${slot.name}(...)\`.`, n.call.span);
        continue;
      }
      if (slot.kind === "one" && list.length > 1) this.err("L1007", `\`${def.name}\` takes one object in \`.${slot.name}\`; wrap several in a Column, Row or Stack.`, n.call.span);
      const rendered = list.map((c) => this.child(c, sc, comp, slot.kind === "text"));
      const many = rendered.length > 1;
      if (many && slot.default) staticList = true;
      const value = !many ? (rendered[0] as string) : slot.default ? `[${rendered.join(", ")}]` : `$js($Fr, { children: [${rendered.join(", ")}] })`;
      if (slot.kind === "text" && (def.name === "Gap" || def.name === "Icon")) {
        // Positional value: Gap(20), Icon('star')
        const key = def.name === "Gap" ? "size" : "name";
        props.push(`v: { ${JSON.stringify(key)}: ${rendered[0]} }`);
        continue;
      }
      props.push(slot.default ? `children: ${value}` : `${slot.name}: ${value}`);
    }
    return `${staticList ? "$js" : "$j"}($.N, { ${props.join(", ")} })`;
  }

  /** Deterministic adaptation: rows of hug children wrap; rows with fill children stack. */
  private rowHasFill(n: ObjNode): boolean {
    const kids = (n.children.get("objs") ?? []).filter((c) => c.kind === "node").map((c) => (c as { node: ObjNode }).node);
    return kids.some((k) => fills(k));
  }

  private isAddressable(n: ObjNode): boolean {
    if (n.id) return true;
    if (this.project.config.access.inject === "open") return true;
    const addr = runtimeAddress(n.comp, n);
    return this.graph.entries.some((e) => e.address === addr) || this.preTargets.has(addr);
  }

  /** Addresses targeted anywhere in the project, computed before emission. */
  preTargets = new Set<string>();

  private child(c: ObjNode["children"] extends Map<string, infer L> ? (L extends Array<infer C> ? C : never) : never, sc: Scope, comp: CompDef, text: boolean): string {
    if (c.kind === "node") return this.node(c.node, sc, comp);
    if (c.kind === "forward") return "$p.children";
    const g = this.expr(c.expr, sc, text ? { type: "txt" } : { type: "obj" });
    if (text && g.type !== "txt" && g.konst === undefined) return `$V.str(${g.code})`;
    return g.code;
  }

  private userNode(n: ObjNode, sc: Scope, comp: CompDef): string {
    const target = n.user as CompDef;
    const props: string[] = [];
    const common: string[] = [];
    const paramNames = new Set(target.params.map((p) => p.name));
    const seen = new Set<string>();
    for (const e of n.config) {
      if (paramNames.has(e.key)) {
        const p = target.params.find((x) => x.name === e.key);
        seen.add(e.key);
        props.push(`${JSON.stringify(e.key)}: ${this.expr(e.value, sc, { type: p?.type ? normalizeType(p.type) : undefined }).code}`);
      } else {
        const common0 = widget("Container")?.keys.find((k) => k.name === e.key && ["margin", "opacity", "hide", "shrink", "flex", "cursor", "w", "h", "minW", "maxW", "minH", "maxH"].includes(k.name));
        if (common0) common.push(`${JSON.stringify(e.key)}: ${this.expr(e.value, sc, { type: common0.type, values: common0.values }).code}`);
        else {
          const s = suggest(e.key, paramNames);
          this.err("L1002", `\`${target.name}\` has no param \`${e.key}\`.${s.length ? ` Did you mean ${s.map((x) => `\`${x}\``).join(", ")}?` : ""}`, e.keySpan);
        }
      }
    }
    for (const p of target.params) if (p.required && !seen.has(p.name)) this.err("L1008", `\`${target.name}\` needs \`${p.name}\`.`, n.call.span);
    if (common.length) props.push(`$o: { ${common.join(", ")} }`);
    const kids = n.children.get("obj") ?? [];
    if (kids.length) {
      const rendered = kids.map((c) => this.child(c, sc, comp, false));
      props.push(`children: ${rendered.length === 1 ? rendered[0] : `$js($Fr, { children: [${rendered.join(", ")}] })`}`);
    }
    if (n.id || this.isAddressable(n)) props.push(`$a: ${comp.kind === "widget" ? `(($p.$a ?? ${JSON.stringify(comp.name)}) + ">" + ${JSON.stringify(n.address)})` : JSON.stringify(runtimeAddress(comp, n))}`);
    const events = this.events(n, null, sc);
    if (events) props.push(`$on: ${events}`);
    const ref = this.mod.layrImports.has(target.name) || this.mod.comps.includes(target) ? target.name : [...this.mod.layrImports.entries()].find(([, v]) => v.name === target.name)?.[0] ?? target.name;
    return `$j(${ref}, { ${props.join(", ")} })`;
  }

  private foreign(n: ObjNode, sc: Scope, comp: CompDef): string {
    const props: string[] = [];
    const propsMod = n.modifiers.get("props") ?? [];
    const fp: string[] = [];
    for (const m of propsMod) for (const it of m.items ?? []) if (it.type === "Prop") fp.push(`${JSON.stringify(it.key)}: ${this.expr(it.value, sc).code}`);
    for (const m of n.modifiers.get("slot") ?? []) for (const it of m.items ?? []) if (it.type === "Prop") fp.push(`${JSON.stringify(it.key)}: ${this.expr(it.value, sc, { type: "obj" }).code}`);
    const on = n.modifiers.get("on") ?? [];
    for (const m of on)
      for (const it of m.items ?? [])
        if (it.type === "Prop") fp.push(`${JSON.stringify(`on${it.key.charAt(0).toUpperCase()}${it.key.slice(1)}`)}: (...$args) => $.run(${this.actionFn(it.value, sc)}, $args)`);
    const kids = n.children.get("obj") ?? [];
    if (kids.length) {
      const rendered = kids.map((c) => this.child(c, sc, comp, false));
      fp.push(`children: ${rendered.length === 1 ? rendered[0] : `$js($Fr, { children: [${rendered.join(", ")}] })`}`);
    }
    if (n.config.length) {
      const box = widget("Container") as WidgetDef;
      const cfg: string[] = [];
      for (const e of n.config) {
        const k = keyOf(box, e.key);
        if (!k || !["w", "h", "size", "minW", "maxW", "minH", "maxH", "padding", "margin", "objAlign", "overflow", "opacity", "hide", "flex", "shrink"].includes(k.name)) {
          this.err("L1002", `\`.config\` on a React component accepts only LAYR layout keys; pass component props with \`.props(${e.key}: ...)\`.`, e.keySpan);
          continue;
        }
        cfg.push(`${JSON.stringify(k.name)}: ${this.expr(e.value, sc, { type: k.type, values: k.values }).code}`);
      }
      props.push(`bx: { ${cfg.join(", ")} }`);
    }
    if (n.id) props.push(`a: ${JSON.stringify(runtimeAddress(comp, n))}`);
    props.push(`c: ${n.name}`, `p: { ${fp.join(", ")} }`);
    if (!this.project.config.targets.every((t) => t === "react")) this.err("L9001", `\`${n.name}\` is a React component and runs only on the React target.`, n.call.callee.span, "info");
    return `$j($.F, { ${props.join(", ")} })`;
  }

  /** `If(.cnd(x) .obj(A) .fb(B))` and `Each(.of(list) .as(item, i) .key(item.id) .obj(Row(...)))`. */
  private construct(n: ObjNode, sc: Scope, comp: CompDef): string {
    const mods = n.modifiers;
    const renderList = (slot: string) => {
      const list = n.children.get(slot) ?? [];
      if (!list.length) return "null";
      const r = list.map((c) => this.child(c, sc, comp, false));
      return r.length === 1 ? (r[0] as string) : `$js($Fr, { children: [${r.join(", ")}] })`;
    };
    if (n.name === "If") {
      const cnd = exprItems(mods.get("cnd")?.[0]?.items ?? null)[0];
      if (!cnd) this.err("L1008", "`If` needs `.cnd(condition)`.", n.call.span);
      const test = cnd ? this.expr(cnd, sc, { type: "bool" }).code : "false";
      // Presence lets an outgoing branch finish its Animate `.exit(...)` before the next one mounts.
      return `$j($.Presence, { k: ${test} ? "a" : "b", children: ${test} ? ${renderList("obj")} : ${renderList("fb")} })`;
    }
    if (n.name === "DesignScale") {
      const cfg = designScaleFrom(n.call, this.mod.diagnostics, this.mod.path);
      const cls = `xds${hash(JSON.stringify(cfg))}`;
      if (!this.cssRules.has(cls)) this.cssRules.set(cls, `.${cls}{width:100%;align-self:stretch}\n${scaleCss(cfg, { selector: `.${cls}`, basis: "container" })}`);
      return `$j($.N, { w: "Container", c: ${JSON.stringify(`l l-box ${cls}`)}, children: ${renderList("obj")} })`;
    }
    const of = exprItems(mods.get("of")?.[0]?.items ?? null)[0];
    if (!of) this.err("L1008", "`Each` needs `.of(list)`.", n.call.span);
    const as = exprItems(mods.get("as")?.[0]?.items ?? null).map((e) => identName(e) ?? "item");
    const item = as[0] ?? "item";
    const index = as[1] ?? "$i";
    const inner = new Scope(sc);
    inner.set(item, { kind: "value", code: item, type: null });
    inner.set(index, { kind: "value", code: index, type: "int" });
    const keyExpr = exprItems(mods.get("key")?.[0]?.items ?? null)[0];
    const key = keyExpr ? this.expr(keyExpr, inner).code : index;
    const list = n.children.get("obj") ?? [];
    const body = list.map((c) => this.child(c, inner, comp, false));
    const one = body.length === 1 ? (body[0] as string) : `$js($Fr, { children: [${body.join(", ")}] })`;
    return `$j($Fr, { children: (${of ? this.expr(of, sc).code : "[]"} ?? []).map((${item}, ${index}) => $j($Fr, { children: ${one} }, ${key})) })`;
  }

  private motion(n: ObjNode, sc: Scope): string {
    const parts: string[] = [];
    for (const name of ["eases", "enter", "exit"]) {
      const m = firstModifier(n.call.items, name);
      if (!m) continue;
      if (name === "eases") {
        const eases = (m.items ?? []).filter((i): i is Prop => i.type === "Prop").map((p) => `${JSON.stringify(p.key)}: ${this.expr(p.value, sc, { type: "motion" }).code}`);
        // `animBox.x: springGentle` form from the notes: members are parsed as ExprItems of assignments? accept Prop only.
        parts.push(`eases: { ${eases.join(", ")} }`);
      } else parts.push(`${name}: [${exprItems(m.items).map((e) => this.expr(e, sc, { type: "motion" }).code).join(", ")}]`);
    }
    return `{ ${parts.join(", ")} }`;
  }

  private a11yChecks(n: ObjNode, def: WidgetDef, s: Record<string, unknown>, d: Record<string, string>) {
    const has = (k: string) => k in s || k in d;
    if (def.name === "Image" && !has("alt") && s.decorative !== true && !has("decorative")) this.err("L6001", "Image needs `alt` text or `decorative: true`.", n.call.span);
    if (["Input", "Toggle", "Select", "Slider"].includes(def.name) && !has("label") && !firstModifier(n.call.items, "a11y")) this.err("L6002", `${def.name} needs a \`label\`.`, n.call.span);
    if (def.name === "Button" && !has("label") && !(n.children.get("obj") ?? []).length && !firstModifier(n.call.items, "a11y")) this.err("L6003", "Button needs a `label` or content.", n.call.span, "warning");
  }

  // -------------------------------------------------------------- config

  private config(n: ObjNode, def: WidgetDef, sc: Scope): { staticCfg: Record<string, unknown>; dynamic: Record<string, string>; keysSeen: Set<string> } {
    const staticCfg: Record<string, unknown> = {};
    const dynamic: Record<string, string> = {};
    const keysSeen = new Set<string>();
    for (const e of n.config) {
      const k = keyOf(def, e.key);
      if (!k) {
        const s = suggestKeys(def, e.written);
        this.mod.diagnostics.push({
          code: "L1002",
          severity: "error",
          message: `\`${def.name}\` has no config key \`${e.written}\`.${s.length ? ` Did you mean ${s.map((x) => `\`${x}\``).join(", ")}?` : ""}`,
          span: e.keySpan,
          file: this.mod.path,
          fixes: s.slice(0, 1).map((x) => ({ title: `Change to ${x}`, edits: [{ span: e.keySpan, text: x }] })),
        });
        continue;
      }
      if (k.name !== e.written && !(e.written.startsWith("border") && k.name === e.key)) {
        report(this.mod, "L1011", `\`${e.written}\` is written \`${k.name}\`.`, e.keySpan, "info", { fixes: [{ title: `Rename to ${k.name}`, edits: [{ span: e.keySpan, text: k.name }] }] });
      }
      if (keysSeen.has(k.name)) this.err("L1012", `\`${k.name}\` is set twice.`, e.keySpan);
      keysSeen.add(k.name);
      if (e.immutable) this.markImmutable(n, k.name, e.span);
      const g = this.expr(e.value, sc, { type: k.type, values: k.values });
      this.checkType(k, g, e.value.span);
      if (g.konst !== undefined && g.konst !== NOT_CONST) staticCfg[k.name] = g.konst;
      else dynamic[k.name] = g.code;
    }
    return { staticCfg, dynamic, keysSeen };
  }

  private markImmutable(n: ObjNode, key: string, span: Span) {
    const addr = runtimeAddress(n.comp, n);
    const set = this.graph.immutable.get(addr) ?? new Set<string>();
    set.add(key);
    this.graph.immutable.set(addr, set);
    this.graph.immutableSites.set(`${addr}#${key}`, { file: this.mod.path, span });
  }

  /** `.at(frame, ...)`: static per-frame entries become interpolated/stepped CSS; dynamic ones go to the runtime. */
  private atConfig(n: ObjNode, def: WidgetDef, sc: Scope, dynamic: Record<string, string>): { base: Record<string, unknown>; media: Array<{ media: string; decls: Record<string, string> }> } {
    if (!n.at.length) return { base: {}, media: [] };
    const perKey = new Map<string, { values: Record<string, unknown>; codes: Record<string, string>; step: boolean; dyn: boolean }>();
    const baseFrame = [...this.project.config.designScale.frames].sort((a, b) => a.from - b.from)[0]?.name ?? "m";
    // The plain config value is the base-frame value unless the base frame is given explicitly.
    for (const e of n.config) {
      const k = keyOf(def, e.key);
      if (!k) continue;
      const entry = { values: {} as Record<string, unknown>, codes: {} as Record<string, string>, step: false, dyn: false };
      perKey.set(k.name, entry);
    }
    for (const at of n.at) {
      for (const e of at.entries) {
        const k = keyOf(def, e.key);
        if (!k) {
          this.err("L1002", `\`${def.name}\` has no config key \`${e.written}\`.`, e.keySpan);
          continue;
        }
        const g = this.expr(e.value, sc, { type: k.type, values: k.values });
        const entry = perKey.get(k.name) ?? { values: {}, codes: {}, step: false, dyn: false };
        if (g.konst !== undefined && g.konst !== NOT_CONST) entry.values[at.frame] = g.konst;
        else entry.dyn = true;
        entry.codes[at.frame] = g.code;
        if (e.step) entry.step = true;
        perKey.set(k.name, entry);
      }
    }
    const base: Record<string, unknown> = {};
    const media: Array<{ media: string; decls: Record<string, string> }> = [];
    for (const [key, entry] of perKey) {
      const frames = Object.keys(entry.codes);
      if (!frames.length) continue;
      const cfgEntry = n.config.find((e) => keyOf(def, e.key)?.name === key);
      if (entry.dyn || key in dynamic) {
        // Runtime picks the value for the active frame (stepped).
        const pairs = [...frames.map((f) => `${f}: ${entry.codes[f]}`)];
        if (cfgEntry) {
          const order = [...this.project.config.designScale.frames].sort((a, b) => a.from - b.from).map((f) => f.name);
          const target = !(baseFrame in entry.codes) ? baseFrame : order.find((f) => !(f in entry.codes));
          if (target) pairs.unshift(`${target}: ${dynamic[key] ?? this.expr(cfgEntry.value, sc, {}).code}`);
        }
        dynamic[key] = `$V.frames({ ${pairs.join(", ")} }, true)`;
        continue;
      }
      const values: Record<string, unknown> = { ...entry.values };
      if (cfgEntry) {
        const g = this.expr(cfgEntry.value, sc, {});
        if (g.konst !== undefined && g.konst !== NOT_CONST) {
          // The plain value belongs to the smallest frame; when `.at` sets that frame itself, the
          // plain value starts at the next frame up instead of being silently dropped.
          const order = [...this.project.config.designScale.frames].sort((a, b) => a.from - b.from).map((f) => f.name);
          const target = !(baseFrame in values) ? baseFrame : order.find((f) => !(f in values));
          if (target) values[target] = g.konst;
        }
      }
      base[key] = { $: "frames", values, step: entry.step };
    }
    void media;
    return { base, media };
  }

  private checkType(k: KeyDef, g: Gen, span: Span) {
    if (g.type === "any" || g.type === "unknown") return;
    const want = k.type;
    const ok: Record<string, string[]> = {
      len: ["len", "num", "int", "sizing"],
      num: ["num", "int", "len"],
      int: ["int", "num"],
      txt: ["txt"],
      bool: ["bool"],
      color: ["color"],
      paint: ["color", "paint"],
      align: ["align"],
      axis: ["axis", "enum"],
      insets: ["insets", "num", "int", "len"],
      size: ["size", "num", "int", "len"],
      radius: ["len", "num", "int", "insets"],
      shadow: ["shadow", "list"],
      time: ["num", "int", "time"],
      angle: ["num", "int"],
      enum: ["enum", "txt"],
    };
    const accepted = ok[want];
    // Font weights are named or numeric (variable fonts take any weight from 1 to 1000).
    const numericWeight = k.name === "weight" && (g.type === "int" || g.type === "num");
    if (accepted && !accepted.includes(g.type) && !numericWeight) this.err("L1003", `\`${k.name}\` expects ${describeType(want)} but got ${describeType(g.type)}.`, span);
  }

  private constCode(v: unknown): string {
    if (v === null || v === undefined) return String(v);
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "string") return JSON.stringify(v);
    if (v instanceof Color) return this.colorCode(v);
    if (Array.isArray(v)) return `[${v.map((x) => this.constCode(x)).join(", ")}]`;
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      return `{ ${Object.entries(o).map(([k, x]) => `${JSON.stringify(k)}: ${this.constCode(x)}`).join(", ")} }`;
    }
    return "undefined";
  }

  private cssClass(decls: Record<string, string>, media: Array<{ media: string; decls: Record<string, string> }>): string | null {
    const base = declsCss(decls);
    const med = media.map((m) => `@media ${m.media}{.§{${declsCss(m.decls)}}}`).join("");
    if (!base && !med) return null;
    const cls = `x${hash(`${base}|${med}`)}`;
    if (!this.cssRules.has(cls)) this.cssRules.set(cls, `${base ? `.${cls}{${base}}` : ""}${med.replaceAll("§", cls)}`);
    return cls;
  }

  // -------------------------------------------------------------- events and actions

  private events(n: ObjNode, def: WidgetDef | null, sc: Scope): string | null {
    const out: string[] = [];
    for (const m of n.modifiers.get("fnc") ?? []) {
      const prim = def?.primaryAction ?? "press";
      out.push(`${JSON.stringify(prim)}: ${this.actionModifier(m, sc)}`);
      if (def && !def.primaryAction && def.layout !== "passthrough") {
        // Any object can take .fnc as a tap handler.
      }
    }
    for (const m of n.modifiers.get("on") ?? []) {
      for (const it of m.items ?? []) {
        if (it.type !== "Prop") {
          this.err("L0011", "`.on` takes `event: action` pairs, e.g. `.on(hover: grow())`.", it.span);
          continue;
        }
        if (def?.events && !def.events.includes(it.key)) this.err("L1006", `\`${def.name}\` has no event \`${it.key}\`. Events: ${def.events.join(", ")}.`, it.keySpan);
        out.push(`${JSON.stringify(it.key)}: ${this.actionFn(it.value, sc)}`);
      }
    }
    return out.length ? `{ ${out.join(", ")} }` : null;
  }

  /** `.fnc(calc(index))`, `.fnc(.if(...) ...)`, `.fnc { ts }`, `.fnc(calc)`. */
  private actionModifier(m: Modifier, sc: Scope): string {
    const asc = new Scope(sc);
    asc.set("value", { kind: "value", code: "value", type: null });
    asc.set("event", { kind: "value", code: "event", type: null });
    const saved = this.inAction;
    this.inAction = true;
    const body = this.action(m.items, m.block, asc);
    this.inAction = saved;
    return `async ($ctx, value, event) => {\n${body}\n}`;
  }

  private actionFn(e: Expr, sc: Scope): string {
    const asc = new Scope(sc);
    asc.set("value", { kind: "value", code: "value", type: null });
    asc.set("event", { kind: "value", code: "event", type: null });
    const saved = this.inAction;
    this.inAction = true;
    let body: string;
    if (e.type === "Block") body = this.tsBody(e, asc);
    else body = this.statement(e, asc);
    this.inAction = saved;
    return `async ($ctx, value, event) => {\n${body}\n}`;
  }

  /** SAPI steps + optional TS block → statements. */
  private action(items: Item[] | null, block: Block | null, sc: Scope): string {
    const out: string[] = [];
    const list = items ?? [];
    for (let i = 0; i < list.length; i++) {
      const it = list[i] as Item;
      if (it.type === "Modifier" && it.name === "if") {
        // First-match chain of adjacent .if, closed by .fb
        const chain: string[] = [];
        let j = i;
        while (j < list.length) {
          const cur = list[j] as Item;
          if (cur.type === "Modifier" && cur.name === "if") {
            const cnd = firstModifier(cur.items ?? [], "cnd");
            const test = cnd ? this.expr(exprItems(cnd.items)[0] as Expr, sc, { type: "bool" }).code : "false";
            if (!cnd) this.err("L1008", "`.if` needs `.cnd(condition)`.", cur.span);
            const steps = (cur.items ?? []).filter((x) => !(x.type === "Modifier" && x.name === "cnd"));
            chain.push(`${chain.length ? " else " : ""}if (${test}) {\n${this.action(steps, cur.block, sc)}\n}`);
            j++;
          } else if (cur.type === "Modifier" && cur.name === "fb") {
            chain.push(` else {\n${this.action(cur.items, cur.block, sc)}\n}`);
            j++;
            break;
          } else break;
        }
        out.push(chain.join(""));
        i = j - 1;
        continue;
      }
      if (it.type === "Modifier") {
        switch (it.name) {
          case "exe":
          case "exc":
            if (it.name === "exc") report(this.mod, "L1011", "`.exc` is written `.exe`.", it.nameSpan, "info", { fixes: [{ title: "Rename to .exe", edits: [{ span: it.nameSpan, text: "exe" }] }] });
            out.push(this.action(it.items, it.block, sc));
            break;
          case "fb":
            this.err("L0011", "`.fb` must follow an `.if`.", it.span);
            break;
          case "wait": {
            const d = exprItems(it.items)[0];
            out.push(`await $ctx.wait(${d ? this.expr(d, sc, { type: "time" }).code : "0"});`);
            break;
          }
          case "loop": {
            const times = firstModifier(it.items ?? [], "times");
            const wh = firstModifier(it.items ?? [], "while");
            const steps = (it.items ?? []).filter((x) => !(x.type === "Modifier" && (x.name === "times" || x.name === "while")));
            const inner = this.action(steps, it.block, sc);
            if (times) out.push(`for (let $n = 0, $m = ${this.expr(exprItems(times.items)[0] as Expr, sc).code}; $n < $m && $ctx.alive(); $n++) {\n${inner}\n}`);
            else if (wh) out.push(`while ((${this.expr(exprItems(wh.items)[0] as Expr, sc, { type: "bool" }).code}) && $ctx.alive()) {\n${inner}\nawait $ctx.frame();\n}`);
            else out.push(`while ($ctx.alive()) {\n${inner}\nawait $ctx.frame();\n}`);
            break;
          }
          case "call":
            for (const e of exprItems(it.items)) out.push(this.statement(e, sc));
            break;
          case "go": {
            const args = it.items ?? [];
            const target = exprItems(args)[0];
            const params = args.filter((x): x is Prop => x.type === "Prop").map((p) => `${JSON.stringify(p.key)}: ${this.expr(p.value, sc).code}`);
            out.push(`$.go(${target ? this.pageRef(target, sc) : "null"}, { ${params.join(", ")} });`);
            break;
          }
          default:
            this.err("L1006", `Unknown step \`.${it.name}\`. Steps: .if/.cnd/.fb, .exe, .wait, .loop, .call, .go.`, it.nameSpan);
        }
        continue;
      }
      if (it.type === "ExprItem") {
        out.push(this.statement(it.expr, sc));
        continue;
      }
      if (it.type === "Decl") {
        const init = it.init ? this.expr(it.init, sc).code : "undefined";
        out.push(`let ${it.name} = ${init};`);
        sc.set(it.name, { kind: "value", code: it.name, type: it.typeRef?.name ?? null });
        continue;
      }
      this.err("L0011", "Unexpected item in an action.", it.span);
    }
    if (block) out.push(this.tsBody(block, sc));
    return out.join("\n");
  }

  private tsBody(block: Block, sc: Scope): string {
    const r = rewriteBody(block.code, bodyScope(sc));
    for (const e of r.errors) this.err("L0014", `TypeScript: ${e.message}`, spanAt(block, e.offset));
    for (const w of r.writes) this.graphWrite(w.address, w.key, spanAt(block, w.offset), null, "write");
    for (const w of r.reads) this.graph.entries.push({ kind: "read", address: w.address, key: w.key, order: null, file: this.mod.path, span: spanAt(block, w.offset), owner: this.currentComp?.name ?? null });
    if (r.hooks.length) this.err("L9002", `React hooks (${r.hooks.join(", ")}) may only be called inside \`.react { }\`.`, block.span);
    return r.code;
  }

  private statement(e: Expr, sc: Scope): string {
    if (e.type === "Block") return this.tsBody(e, sc);
    if (e.type === "Ident") {
      const b = sc.lookup(e.name);
      if (b?.kind === "function") return `await ${b.code}($ctx);`;
    }
    if (e.type === "Assign") return `${this.assign(e.target, e.op, e.value, sc)};`;
    if (e.type === "Update" || (e.type === "Unary" && (e.op === "++" || e.op === "--"))) {
      const arg = e.argument;
      const op = e.op === "++" ? "+=" : "-=";
      return `${this.assign(arg, op, { type: "Number", value: 1, unit: "", raw: "1", span: e.span }, sc)};`;
    }
    const g = this.expr(e, sc);
    return `${g.code.startsWith("{") ? `(${g.code})` : g.code};`;
  }

  private assign(target: Expr, op: string, value: Expr, sc: Scope): string {
    if (target.type === "Ident") {
      const b = sc.lookup(target.name);
      if (!b) {
        this.err("L1005", `Unknown name \`${target.name}\`.`, target.span);
        return "void 0";
      }
      if (b.kind === "signal") {
        const v = this.expr(value, sc, { type: b.type ? normalizeType(b.type) : undefined }).code;
        const numericVar = ["int", "num", "time", "double"].includes(b.type ?? "");
        if (op === "=") return `${b.code}.set(${v})`;
        return numericVar ? `${b.code}.set(${b.code}.get() ${op.slice(0, -1)} ${v})` : `${b.code}.set($V.arith(${JSON.stringify(op.slice(0, -1))}, ${b.code}.get(), ${v}))`;
      }
      if (b.kind === "value") {
        const v = this.expr(value, sc).code;
        return `${b.code} ${op} ${v}`;
      }
      this.err("L1003", `\`${target.name}\` cannot be assigned.`, target.span);
      return "void 0";
    }
    const ref = this.resolveRef(target, sc);
    if (ref && ref.key) {
      const key = ref.key;
      this.checkMutation(ref.address, key, target.span, false);
      this.graphWrite(ref.address, key, target.span, null, "write");
      const v = this.expr(value, sc).code;
      const newVal = op === "=" ? v : `$V.arith(${JSON.stringify(op.slice(0, -1))}, $.read(${JSON.stringify(ref.address)}, ${JSON.stringify(key)}), ${v})`;
      return `$.write(${JSON.stringify(ref.address)}, ${JSON.stringify(key)}, ${newVal})`;
    }
    const t = this.expr(target, sc).code;
    return `${t} ${op} ${this.expr(value, sc).code}`;
  }

  private checkMutation(address: string, key: string, span: Span, force: boolean) {
    if (RENDERED_FEATURES[key]) this.err("L3104", `\`${key}\` is measured from layout and read-only.`, span);
    const imm = this.graph.immutable.get(address) ?? this.pendingImmutable.get(address);
    if (imm?.has(key) && !force) {
      const site = this.graph.immutableSites.get(`${address}#${key}`);
      this.mod.diagnostics.push({
        code: "L3101",
        severity: "error",
        message: `\`${key}\` of \`${address}\` is \`!mut\` and refuses Export/Extract/Inject mutation.`,
        span,
        file: this.mod.path,
        related: site ? [{ message: "Declared !mut here.", span: site.span, file: site.file }] : [],
      });
    }
  }

  /** Immutable features collected from every module before emission. */
  pendingImmutable = new Map<string, Set<string>>();

  private graphWrite(address: string, key: string, span: Span, order: number | null, kind: GraphEntry["kind"]) {
    this.graph.entries.push({ kind, address, key, order, file: this.mod.path, span, owner: this.currentComp?.name ?? null });
  }

  private pageRef(e: Expr, sc: Scope): string {
    const name = identName(e);
    if (name && (this.project.pages.has(name) || this.project.widgets.has(name))) return JSON.stringify(name);
    return this.expr(e, sc).code;
  }

  // -------------------------------------------------------------- Export / Extract / Inject

  private emitEEI(e: EEIDef, sc: Scope, where: "module" | "component"): string {
    const call = e.call;
    const target = this.eeiTarget(call, sc);
    const orderMod = firstModifier(call.items, "exeOrder");
    const orderExpr = exprItems(orderMod?.items ?? null)[0];
    let order: number | null = null;
    if (orderExpr) {
      const g = this.expr(orderExpr, sc);
      if (typeof g.konst === "number") order = g.konst;
      else this.err("L1003", "`.exeOrder` takes a constant number.", orderExpr.span);
    }
    const force = !!firstModifier(call.items, "force");
    if (force && !this.forceAllowed()) this.err("L3105", "`Inject(.force …)` is only allowed in files matched by `access.force` in layr.yaml.", call.span);
    const tsc = new Scope(sc);
    if (target) tsc.set(target.local, { kind: "object", node: target.node as ObjNode, comp: target.comp });
    const out: string[] = [];

    if (e.kind === "Extract" || e.kind === "Export") {
      for (const it of call.items) {
        if (it.type !== "Decl") continue;
        const ref = it.init ? this.resolveRef(it.init, tsc) : null;
        if (ref?.key) {
          this.graph.entries.push({ kind: "extract", address: ref.address, key: ref.key, order, file: this.mod.path, span: it.init?.span ?? it.span, owner: this.currentComp?.name ?? null });
          const read = `$.read(${JSON.stringify(ref.address)}, ${JSON.stringify(ref.key)}${order !== null ? `, ${order}` : ""})${ref.rest}`;
          out.push(`const ${it.name} = $.computed(() => ${read});`);
        } else {
          const g = it.init ? this.expr(it.init, tsc) : { code: "undefined" };
          out.push(`const ${it.name} = $.computed(() => ${g.code});`);
        }
        sc.set(it.name, { kind: "computed", code: it.name, type: it.typeRef?.name ?? null });
      }
      return out.join("\n");
    }

    // Inject: each assignment/update is a layer.
    const layers: string[] = [];
    for (const it of call.items) {
      if (it.type !== "ExprItem") continue;
      const ex = it.expr;
      let tgt: Expr | null = null;
      let valueFn: string | null = null;
      if (ex.type === "Assign") {
        tgt = ex.target;
        const ref = this.resolveRef(tgt, tsc);
        if (!ref?.key) {
          this.err("L3301", "Inject assigns features of objects: `card.padding = ...`.", ex.target.span);
          continue;
        }
        const psc = new Scope(tsc);
        psc.set("$prev", { kind: "value", code: "$prev", type: null });
        this.prevTarget = { address: ref.address, key: ref.key };
        const v = this.expr(ex.value, psc).code;
        this.prevTarget = null;
        valueFn = ex.op === "=" ? `($prev) => ${v}` : `($prev) => $V.arith(${JSON.stringify(ex.op.slice(0, -1))}, $prev, ${v})`;
        this.injectLayer({ address: ref.address, key: ref.key as string }, order, force, ex.target.span, valueFn, layers);
      } else if (ex.type === "Update" || (ex.type === "Unary" && (ex.op === "++" || ex.op === "--"))) {
        tgt = ex.argument;
        const ref = this.resolveRef(tgt, tsc);
        if (!ref?.key) {
          this.err("L3301", "Inject changes features of objects: `card.padding++`.", ex.span);
          continue;
        }
        valueFn = `($prev) => $V.arith(${JSON.stringify(ex.op === "++" ? "+" : "-")}, $prev, 1)`;
        this.injectLayer({ address: ref.address, key: ref.key as string }, order, force, ex.span, valueFn, layers);
      } else this.err("L0011", "Inject holds assignments such as `card.padding = pad * 2`.", ex.span);
    }
    if (!layers.length) return "";
    const list = `[${layers.join(", ")}]`;
    return where === "module" ? `$.injectGlobal(${list});` : `$.useInject(${list});`;
  }

  private prevTarget: { address: string; key: string } | null = null;

  private injectLayer(ref: { address: string; key: string }, order: number | null, force: boolean, span: Span, fn: string, layers: string[]) {
    this.checkMutation(ref.address, ref.key, span, force);
    this.graph.entries.push({ kind: force ? "force" : "inject", address: ref.address, key: ref.key, order, file: this.mod.path, span, owner: this.currentComp?.name ?? null });
    const pos = this.mod.source.position(span.start);
    layers.push(`{ a: ${JSON.stringify(ref.address)}, k: ${JSON.stringify(ref.key)}, o: ${order ?? "null"}, f: ${fn}, src: ${JSON.stringify(`${this.mod.path}:${pos.line}`)}${force ? ", force: true" : ""} }`);
  }

  private forceAllowed(): boolean {
    if (this.project.config.access.inject === "open") return true;
    return this.project.config.access.force.some((g) => globMatch(g, this.mod.path));
  }

  /** `.from(SomePage.card)` / `.into(...)` / `.lookUp(page: SomePage, id: card)`. */
  private eeiTarget(call: Call, sc: Scope): { comp: CompDef; node: ObjNode | null; local: string } | null {
    const m = firstModifier(call.items, "from") ?? firstModifier(call.items, "into") ?? firstModifier(call.items, "lookUp");
    if (!m) return null;
    if (m.name === "lookUp") {
      const props = (m.items ?? []).filter((i): i is Prop => i.type === "Prop");
      const page = identName(props.find((p) => p.key === "page" || p.key === "widget")?.value);
      const id = identName(props.find((p) => p.key === "id")?.value);
      report(this.mod, "L1011", "`.lookUp(page: X, id: y)` is written `.from(X.y)` (or `.into(X.y)` in Inject).", m.nameSpan, "info");
      const comp = page ? (this.project.pages.get(page) ?? this.project.widgets.get(page)) : this.currentComp;
      if (!comp) {
        this.err("L3301", `Unknown Page or Widget \`${page}\`.`, m.span);
        return null;
      }
      const node = id ? comp.ids.get(id) : null;
      if (id && !node) this.err("L3301", `\`${comp.name}\` has no object with id \`${id}\`.`, m.span);
      return node ? { comp, node, local: id as string } : null;
    }
    const e = exprItems(m.items)[0];
    if (!e) return null;
    const ref = this.resolveRef(e, sc, true);
    if (!ref || !ref.node) {
      this.err("L3301", "Could not resolve the target object.", e.span);
      return null;
    }
    const segs = flatten(e);
    const local = ref.node.id ?? segs?.[segs.length - 1]?.name ?? ref.node.seg;
    return { comp: ref.comp, node: ref.node, local };
  }

  // -------------------------------------------------------------- references (ids, paths)

  /**
   * Resolves `id.feature`, `Page.id.feature`, `Page.scaffold.body.column.text(1).feature`.
   * With `objectOnly`, the whole expression must name an object.
   */
  resolveRef(e: Expr, sc: Scope, objectOnly = false): { address: string; key: string | null; rest: string; node: ObjNode | null; comp: CompDef } | null {
    const segs = flatten(e);
    if (!segs || !segs.length) return null;
    const first = segs[0] as Seg;
    let comp: CompDef | null = null;
    let node: ObjNode | null = null;
    let i = 1;
    const b = sc.lookup(first.name);
    if (b?.kind === "object") {
      comp = b.comp;
      node = b.node;
    } else if (b?.kind === "group") {
      const mem = segs[1] ? b.members.get((segs[1] as Seg).name) : undefined;
      if (!mem) return null;
      return { address: mem.address, key: mem.key, rest: segs.slice(2).map((s) => `.${s.name}`).join(""), node: mem.node, comp: (mem.node?.comp ?? this.currentComp) as CompDef };
    } else if (!b || b.kind === "comp") {
      comp = b?.kind === "comp" ? b.comp : (this.project.pages.get(first.name) ?? this.project.widgets.get(first.name) ?? null);
      if (!comp) return null;
      if (!comp.root) return null;
      // Root must be matched by the next segment (or an id anywhere).
      const s = segs[1];
      if (!s) return objectOnly ? { address: `${comp.name}::${comp.root.address}`, key: null, rest: "", node: comp.root, comp } : null;
      const grp = comp.exportGroups.get(s.name);
      if (grp) {
        const mem = segs[2] ? grp.get((segs[2] as Seg).name) : undefined;
        if (!mem) {
          this.err("L3301", `Export \`${s.name}\` of \`${comp.name}\` has no member \`${segs[2]?.name ?? ""}\`.`, s.span);
          return null;
        }
        return { address: runtimeAddress(comp, mem.node), key: mem.key, rest: segs.slice(3).map((x) => `.${x.name}`).join(""), node: mem.node, comp };
      }
      if (comp.ids.has(s.name)) node = comp.ids.get(s.name) as ObjNode;
      else if (comp.root.seg === s.name && (s.index === undefined || s.index === 0)) node = comp.root;
      else {
        this.err("L3301", `\`${comp.name}\` has no \`${s.name}\` at its root (root is \`${comp.root.seg}\`).`, s.span);
        return null;
      }
      i = 2;
    } else return null;

    if (first.name.startsWith("_") && comp && comp.module !== this.mod) {
      this.err("L3302", `\`${first.name}\` is private to ${comp.module.path}.`, first.span);
      return null;
    }

    let pendingSlot: string | null = null;
    for (; i < segs.length; i++) {
      const s = segs[i] as Seg;
      const cur = node as ObjNode;
      const slotNames = new Set(cur.def?.slots.map((x) => x.name) ?? []);
      const namesChild = [...cur.children.values()].flat().some((c) => c.kind === "node" && (c.node.seg === s.name || c.node.id === s.name));
      if (slotNames.has(s.name) && !pendingSlot && s.index === undefined && cur.children.has(s.name) && !namesChild) {
        pendingSlot = s.name;
        continue;
      }
      const slot = pendingSlot ?? cur.def?.slots.find((x) => x.default)?.name ?? "obj";
      const kids = (cur.children.get(slot) ?? []).filter((c): c is { kind: "node"; node: ObjNode } => c.kind === "node").map((c) => c.node);
      const matches = kids.filter((k) => k.seg === s.name || k.id === s.name);
      pendingSlot = null;
      if (matches.length) {
        if (s.index !== undefined) {
          const m = matches.find((k) => k.index === s.index);
          if (!m) {
            this.err("L3304", `\`${s.name}(${s.index})\` is out of range: there ${matches.length === 1 ? "is 1" : `are ${matches.length}`} \`${s.name}\` here.`, s.span);
            return null;
          }
          node = m;
        } else if (matches.length > 1) {
          this.mod.diagnostics.push({
            code: "L3303",
            severity: "error",
            message: `\`${s.name}\` is ambiguous: ${matches.length} match. Use ${matches.map((m) => `\`${s.name}(${m.index})\``).join(", ")} or give one an \`.id\`.`,
            span: s.span,
            file: this.mod.path,
            fixes: matches.map((m) => ({ title: `Use ${s.name}(${m.index})`, edits: [{ span: s.span, text: `${s.name}(${m.index})` }] })),
          });
          return null;
        } else node = matches[0] as ObjNode;
        continue;
      }
      const deep = (comp as CompDef).ids.get(s.name);
      if (deep) {
        node = deep;
        continue;
      }
      // Remaining segments: feature (+ member access on its value).
      const keyName = featureKey(cur, s.name);
      if (!keyName) {
        const known = [...(cur.def?.keys.map((k) => k.name) ?? []), ...(cur.user?.params.map((p) => p.name) ?? []), ...Object.keys(RENDERED_FEATURES), "obj"];
        const sug = suggest(s.name, known);
        this.err("L3301", `\`${cur.seg}\` has no child or feature \`${s.name}\`.${sug.length ? ` Did you mean ${sug.map((x) => `\`${x}\``).join(", ")}?` : ""}`, s.span);
        return null;
      }
      if (objectOnly) {
        this.err("L3301", "Expected an object here, not a feature.", s.span);
        return null;
      }
      const rest = segs
        .slice(i + 1)
        .map((x) => `.${x.name}`)
        .join("");
      return { address: runtimeAddress(comp as CompDef, cur), key: keyName, rest, node: cur, comp: comp as CompDef };
    }
    if (!node) return null;
    return { address: runtimeAddress(comp as CompDef, node), key: null, rest: "", node, comp: comp as CompDef };
  }

  // -------------------------------------------------------------- expressions

  expr(e: Expr, sc: Scope, expect: Expect = {}): Gen {
    const g = this.expr0(e, sc, expect);
    return g;
  }

  private expr0(e: Expr, sc: Scope, expect: Expect): Gen {
    switch (e.type) {
      case "Number":
        return this.number(e.value, e.unit, expect, e.span);
      case "String":
        return this.string(e, sc);
      case "Color": {
        const c = Color.hex(e.hex);
        return { code: this.hoist(`c:${c.toCss()}`, `$V.Color.hex(${JSON.stringify(`#${e.hex}`)})`), type: "color", konst: c };
      }
      case "Ident":
        return this.ident(e.name, e.span, sc, expect);
      case "Arrow": {
        // Parameters are plain values inside the body; everything else resolves as usual.
        const inner = new Scope(sc);
        for (const p of e.params) inner.set(p.name, { kind: "value", code: p.name, type: null });
        const body = this.expr(e.body, inner);
        return { code: `((${e.params.map((p) => p.name).join(", ")}) => ${body.code})`, type: "fn" };
      }
      case "Paren": {
        const g = this.expr(e.expr, sc, expect);
        return { ...g, code: `(${g.code})` };
      }
      case "Tuple": {
        const els = e.elements.map((x) => this.expr(x, sc, expect.type === "size" ? { type: "len" } : {}));
        if (expect.type === "size" && els.length === 2) {
          const konst = els.every(isConst) ? sizeValue(els[0]?.konst as number, els[1]?.konst as number) : NOT_CONST;
          return { code: `$V.size(${els.map((x) => x.code).join(", ")})`, type: "size", konst };
        }
        const konst = els.every(isConst) ? els.map((x) => x.konst) : NOT_CONST;
        return { code: `[${els.map((x) => x.code).join(", ")}]`, type: "list", konst };
      }
      case "List": {
        const els = e.elements.map((x) => this.expr(x, sc));
        const konst = els.every(isConst) ? els.map((x) => x.konst) : NOT_CONST;
        return { code: `[${els.map((x) => x.code).join(", ")}]`, type: "list", konst };
      }
      case "Unary": {
        if (e.op === "++" || e.op === "--") return { code: this.assign(e.argument, e.op === "++" ? "+=" : "-=", { type: "Number", value: 1, unit: "", raw: "1", span: e.span }, sc), type: "any" };
        const a = this.expr(e.argument, sc, e.op === "!" ? { type: "bool" } : expect);
        if (e.op === "-" && typeof a.konst === "number") return { code: `-${a.code}`, type: a.type, konst: -a.konst };
        if (e.op === "-" && a.type !== "num" && a.type !== "int" && a.type !== "len") return { code: `$V.arith("*", ${a.code}, -1)`, type: a.type };
        return { code: `${e.op}${a.code}`, type: e.op === "!" ? "bool" : a.type, konst: e.op === "!" && typeof a.konst === "boolean" ? !a.konst : NOT_CONST };
      }
      case "Update":
        return { code: this.assign(e.argument, e.op === "++" ? "+=" : "-=", { type: "Number", value: 1, unit: "", raw: "1", span: e.span }, sc), type: "any" };
      case "NonNull": {
        const a = this.expr(e.argument, sc, expect);
        return { ...a, code: `$V.must(${a.code})` };
      }
      case "Binary":
        return this.binary(e.op, e.left, e.right, sc, expect);
      case "Ternary": {
        const t = this.expr(e.test, sc, { type: "bool" });
        const a = this.expr(e.consequent, sc, expect);
        const b = this.expr(e.alternate, sc, expect);
        return { code: `(${t.code} ? ${a.code} : ${b.code})`, type: a.type === b.type ? a.type : "any" };
      }
      case "Assign":
        return { code: this.assign(e.target, e.op, e.value, sc), type: "any" };
      case "Member":
        return this.member(e, sc, expect);
      case "Index": {
        const o = this.expr(e.object, sc);
        const i = this.expr(e.index, sc);
        return { code: `${o.code}[${i.code}]`, type: "any" };
      }
      case "Call":
        return this.call(e, sc, expect);
      case "Block": {
        const r = rewriteBody(e.code, bodyScope(sc), "expression");
        for (const er of r.errors) this.err("L0014", `TypeScript: ${er.message}`, spanAt(e, er.offset));
        return { code: `(${r.code})`, type: "any" };
      }
      case "DotRef":
        if (e.name === "obj") return { code: "$p.children", type: "obj" };
        this.err("L1005", `\`.${e.name}\` is not a value here.`, e.span);
        return { code: "undefined", type: "any" };
      case "Missing":
        return { code: "undefined", type: "any" };
    }
  }

  private number(value: number, unit: string, expect: Expect, span: Span): Gen {
    switch (unit) {
      case "":
      case "ds":
        if (expect.type === "time") return { code: String(value), type: "time", konst: value };
        return { code: String(value), type: Number.isInteger(value) && unit === "" ? "int" : unit === "ds" ? "len" : "num", konst: value };
      case "px":
        return { code: `$V.px(${value})`, type: "len", konst: px(value) };
      case "%":
        return { code: `$V.pct(${value})`, type: expect.type === "len" || expect.type === "insets" || expect.type === "size" ? "len" : "num", konst: pct(value) };
      case "fr":
        return { code: `$V.fr(${value})`, type: "len", konst: fr(value) };
      case "vw":
      case "vh":
      case "dvh":
      case "svh":
      case "lvh":
        return { code: `$V.vp(${value}, ${JSON.stringify(unit)})`, type: "len", konst: vp(value, unit) };
      case "ms":
        return { code: String(value), type: "time", konst: value };
      case "s":
        return { code: String(value * 1000), type: "time", konst: value * 1000 };
      case "deg":
        return { code: String(value), type: "num", konst: value };
      case "hex": {
        const c = Color.argb(value);
        if (expect.type === "color" || expect.type === "paint") return { code: this.colorCode(c), type: "color", konst: c };
        return { code: String(value), type: "int", konst: value };
      }
      default:
        this.err("L1003", `Unknown unit \`${unit}\`. Units: ds, px, %, fr, ms, s, deg.`, span);
        return { code: String(value), type: "num", konst: value };
    }
  }

  private string(e: StringLit, sc: Scope): Gen {
    if (e.parts.every((p) => typeof p === "string")) {
      const s = (e.parts as string[]).join("");
      return { code: JSON.stringify(s), type: "txt", konst: s };
    }
    const parts = e.parts.map((p) => (typeof p === "string" ? p.replace(/[`\\]/g, "\\$&").replace(/\$\{/g, "\\${") : `\${$V.str(${this.expr(p, sc).code})}`));
    return { code: `\`${parts.join("")}\``, type: "txt" };
  }

  private ident(name: string, span: Span, sc: Scope, expect: Expect): Gen {
    if (name === "true" || name === "false") return { code: name, type: "bool", konst: name === "true" };
    if (name === "null") return { code: "null", type: "any", konst: null };
    if (this.prevTarget) {
      // Inside an Inject value, `card.padding` of the target is handled in member(); bare names fall through.
    }
    const b = sc.lookup(name);
    if (b) {
      switch (b.kind) {
        case "signal":
        case "computed":
          return { code: `${b.code}.get()`, type: b.type ? normalizeType(b.type) : "any" };
        case "value":
          return { code: b.code, type: b.type ? normalizeType(b.type) : "any" };
        case "function":
          return { code: b.code, type: "fn" };
        case "comp":
          return { code: b.code, type: "obj" };
        case "object":
          return { code: JSON.stringify(runtimeAddress(b.comp, b.node)), type: "object" };
        case "params":
          return { code: "$p", type: "any" };
        case "group":
          return { code: "undefined", type: "any" };
      }
    }
    // Enum-like identifiers resolve against the expected type.
    const t = expect.type;
    if (t === "align") {
      const a = canonicalAlign(name);
      if (a) {
        if (a !== name) report(this.mod, "L1011", `\`${name}\` is written \`${a}\`.`, span, "info", { fixes: [{ title: `Use ${a}`, edits: [{ span, text: a }] }] });
        return { code: JSON.stringify(a), type: "align", konst: a };
      }
    }
    if (t === "axis" && (AXIS_VALUES as readonly string[]).includes(name)) return { code: JSON.stringify(name), type: "axis", konst: name };
    if (t === "axis" && (name === "center" || name === "centre")) return { code: JSON.stringify("mid"), type: "axis", konst: "mid" };
    if (expect.values?.includes(name)) return { code: JSON.stringify(name), type: t === "len" ? "sizing" : "enum", konst: name };
    if (t === "enum" && expect.values && name === "mid" && expect.values.includes("center")) return { code: '"center"', type: "enum", konst: "center" };
    if (t === "page" && (this.project.pages.has(name) || this.project.widgets.has(name))) return { code: JSON.stringify(name), type: "page", konst: name };
    if (t === "txt" && this.project.config.theme.fonts[name]) return { code: JSON.stringify(`var(--layr-font-${name})`), type: "txt", konst: `var(--layr-font-${name})` };
    const themeColor = this.project.config.theme.colors[name];
    if ((t === "color" || t === "paint" || t === undefined || t === "any") && themeColor) {
      const c = Color.token(name, themeColor);
      return { code: this.colorCode(c), type: "color", konst: c };
    }
    if ((t === "color" || t === "paint" || t === undefined || t === "any") && NAMED_COLORS[name]) {
      const c = namedColor(name) as Color;
      return { code: this.hoist(`c:${c.toCss()}`, `$V.Color.hex(${JSON.stringify(c.toCss())})`), type: "color", konst: c };
    }
    if (t === "motion" && BUILTIN_ALIASES[name]) {
      const canon = BUILTIN_ALIASES[name] as string;
      report(this.mod, "L1011", `\`${name}\` is written \`${canon}\`.`, span, "info", { fixes: [{ title: `Use ${canon}`, edits: [{ span, text: canon }] }] });
      const [ns, member] = canon.split(".") as [string, string];
      const nsDef = NAMESPACES[ns];
      const konst = ns === "spring" ? (spring as Record<string, unknown>)[member] : (ease as Record<string, unknown>)[member];
      return { code: `${nsDef?.code}.${member}`, type: "motion", konst };
    }
    if (t === "motion" && (name === "fade" || name === "scale")) return { code: `$V.motion.${name}`, type: "motion" };
    if (this.project.pages.has(name)) return { code: JSON.stringify(name), type: "page", konst: name };
    if (expect.values?.length) {
      const s = suggest(name, expect.values);
      this.err("L1004", `\`${name}\` is not a valid value here. Values: ${expect.values.join(", ")}.${s.length ? ` Did you mean \`${s[0]}\`?` : ""}`, span);
      return { code: JSON.stringify(name), type: "enum" };
    }
    if (t === "align") {
      this.err("L1004", `\`${name}\` is not an alignment. Use ${ALIGN_ALL.join(", ")}.`, span);
      return { code: JSON.stringify(name), type: "align" };
    }
    // Generated names (`$i`, `$p`) are not the author's: never suggest them, and suggest each name once.
    const all = [...new Set([...collectNames(sc), ...Object.keys(VALUE_BUILTINS)])].filter((n) => !n.startsWith("$"));
    const s = suggest(name, all);
    this.err("L1005", `Unknown name \`${name}\`.${s.length ? ` Did you mean ${s.map((x) => `\`${x}\``).join(", ")}?` : ""}`, span);
    return { code: name, type: "any" };
  }

  private binary(op: string, l: Expr, r: Expr, sc: Scope, expect: Expect): Gen {
    const a = this.expr(l, sc, ["&&", "||"].includes(op) ? { type: "bool" } : op === "??" ? expect : {});
    const b = this.expr(r, sc, ["&&", "||"].includes(op) ? { type: "bool" } : op === "??" ? expect : { type: a.type === "len" ? "len" : undefined });
    const numeric = (t: string) => t === "num" || t === "int" || t === "time";
    const constBoth = isConst(a) && isConst(b);
    switch (op) {
      case "+":
      case "-":
      case "*":
      case "/": {
        if (a.type === "txt" || b.type === "txt") return { code: `(${a.code} + ${b.code})`, type: "txt", konst: constBoth && op === "+" ? `${a.konst}${b.konst}` : NOT_CONST };
        if (numeric(a.type) && numeric(b.type)) {
          const k = constBoth ? evalArith(op, a.konst as number, b.konst as number) : NOT_CONST;
          return { code: `(${a.code} ${op} ${b.code})`, type: a.type === "int" && b.type === "int" && op !== "/" ? "int" : "num", konst: k };
        }
        // Lengths, insets and sizes fold at compile time when both sides are constant (static CSS).
        const k = constBoth ? arith(op as "+" | "-" | "*" | "/", a.konst, b.konst) : NOT_CONST;
        return { code: `$V.arith(${JSON.stringify(op)}, ${a.code}, ${b.code})`, type: numeric(a.type) ? b.type : a.type, konst: typeof k === "number" && Number.isNaN(k) ? NOT_CONST : k };
      }
      case "%":
        return { code: `(${a.code} % ${b.code})`, type: "num" };
      case "==":
      case "!=":
      case "===":
      case "!==": {
        const neg = op.startsWith("!");
        if (r.type === "Ident" && r.name === "null") return { code: `(${a.code} ${neg ? "!=" : "=="} null)`, type: "bool" };
        if (["num", "int", "txt", "bool", "enum", "align", "axis"].includes(a.type)) return { code: `(${a.code} ${neg ? "!==" : "==="} ${b.code})`, type: "bool" };
        return { code: `${neg ? "!" : ""}$V.eq(${a.code}, ${b.code})`, type: "bool" };
      }
      case "<":
      case ">":
      case "<=":
      case ">=":
        return { code: `(${a.code} ${op} ${b.code})`, type: "bool" };
      case "&&":
      case "||":
        return { code: `(${a.code} ${op} ${b.code})`, type: "bool" };
      case "??":
        return { code: `(${a.code} ?? ${b.code})`, type: a.type === "any" ? b.type : a.type };
      default:
        return { code: `(${a.code} ${op} ${b.code})`, type: "any" };
    }
  }

  private member(e: Expr & { type: "Member" }, sc: Scope, expect: Expect): Gen {
    // param.x
    if (e.object.type === "Ident") {
      const b = sc.lookup(e.object.name);
      if (b?.kind === "params") {
        const p = b.comp.params.find((x) => x.name === e.name);
        if (!p) {
          const s = suggest(e.name, b.comp.params.map((x) => x.name));
          this.err("L1005", `\`${b.comp.name}\` has no param \`${e.name}\`.${s.length ? ` Did you mean \`${s[0]}\`?` : ""}`, e.nameSpan);
        }
        return { code: `$p.${e.name}`, type: p?.type ? normalizeType(p.type) : "any" };
      }
      // Namespaces: spring.gentle, ease.inOut, frame.name
      if (!b && NAMESPACES[e.object.name]) {
        const ns = NAMESPACES[e.object.name] as { code: string; members: string[]; type: string };
        if (ns.members.length && !ns.members.includes(e.name)) this.err("L1005", `\`${e.object.name}\` has no \`${e.name}\`. Members: ${ns.members.join(", ")}.`, e.nameSpan);
        const konst = e.object.name === "spring" ? (spring as Record<string, unknown>)[e.name] : e.object.name === "ease" ? (ease as Record<string, unknown>)[e.name] : NOT_CONST;
        const code = e.object.name === "frame" ? `$.frame().${e.name}` : e.object.name === "route" ? `$route.${e.name}` : `${ns.code}.${e.name}`;
        return { code, type: ns.type, konst: konst === undefined ? NOT_CONST : konst };
      }
    }
    // Object features (ids, paths, export groups).
    const attempted = this.looksLikeRef(e, sc);
    const ref = attempted ? this.resolveRef(e, sc) : null;
    if (attempted && !ref?.key) return { code: "undefined", type: "any" };
    if (ref?.key) {
      if (this.prevTarget && ref.address === this.prevTarget.address && ref.key === this.prevTarget.key) return { code: `$prev${ref.rest}`, type: "any" };
      this.graph.entries.push({ kind: "read", address: ref.address, key: ref.key, order: null, file: this.mod.path, span: e.span, owner: this.currentComp?.name ?? null });
      return { code: `$.read(${JSON.stringify(ref.address)}, ${JSON.stringify(ref.key)})${ref.rest}`, type: featureType(ref.node, ref.key) };
    }
    // Plain member access (colour getters, size fields, TS values).
    const o = this.expr(e.object, sc, e.object.type === "Ident" && NAMED_COLORS[e.object.name] ? { type: "color" } : {});
    if (o.type === "color" && e.name === "invert") return { code: `${o.code}.invert`, type: "color", konst: o.konst instanceof Color ? o.konst.invert : NOT_CONST };
    if (o.type === "size" && (e.name === "x" || e.name === "y")) {
      const canon = e.name === "x" ? "w" : "h";
      report(this.mod, "L1011", `Sizes use \`.${canon}\` (x/y mean position).`, e.nameSpan, "info", { fixes: [{ title: `Use .${canon}`, edits: [{ span: e.nameSpan, text: canon }] }] });
      return { code: `${o.code}.${canon}`, type: "len" };
    }
    void expect;
    return { code: `${o.code}${e.optional ? "?." : "."}${e.name}`, type: o.type === "size" ? "len" : "any" };
  }

  private looksLikeRef(e: Expr, sc: Scope): boolean {
    const segs = flatten(e);
    if (!segs?.length) return false;
    const first = segs[0] as Seg;
    const b = sc.lookup(first.name);
    return b?.kind === "object" || b?.kind === "group" || (!b && (this.project.pages.has(first.name) || this.project.widgets.has(first.name))) || b?.kind === "comp";
  }

  private call(e: Call, sc: Scope, expect: Expect): Gen {
    const callee = e.callee;
    // Method calls on values: #fff.alpha(50%), white.shade(2), color.mix(x, .3)
    if (callee.type === "Member") {
      if (callee.object.type === "Number") {
        // `size: 120 .border(...)`: a missing comma, not a method on a number.
        this.err("L0012", `Numbers have no methods: put a comma before \`.${callee.name}(...)\` if it is a separate item.`, e.span);
        return { code: "undefined", type: "any" };
      }
      const obj = this.expr(callee.object, sc, callee.object.type === "Ident" && NAMED_COLORS[callee.object.name] ? { type: "color" } : {});
      let method = callee.name;
      if (obj.type === "color" && COLOR_METHOD_ALIASES[method]) {
        const canon = COLOR_METHOD_ALIASES[method] as string;
        report(this.mod, "L1011", `\`.${method}()\` is written \`.${canon}()\`.`, callee.nameSpan, "info", { fixes: [{ title: `Use .${canon}`, edits: [{ span: callee.nameSpan, text: canon }] }] });
        method = canon;
      }
      const args = exprItems(e.items).map((x) => this.expr(x, sc, obj.type === "color" && method === "mix" ? { type: "color" } : {}));
      let konst: unknown = NOT_CONST;
      if (obj.konst instanceof Color && args.every(isConst)) {
        const c = obj.konst;
        const fn = (c as unknown as Record<string, (...a: unknown[]) => unknown>)[method];
        if (typeof fn === "function") konst = fn.apply(c, args.map((a) => a.konst));
      }
      const code = `${obj.code}.${method}(${args.map((a) => a.code).join(", ")})`;
      if (konst instanceof Color) return { code: this.colorCode(konst), type: "color", konst };
      return { code, type: obj.type === "color" ? "color" : "any", konst };
    }
    const name = identName(callee);
    if (!name) return { code: `${this.expr(callee, sc).code}()`, type: "any" };
    const b = sc.lookup(name);
    if (b?.kind === "function") return { code: `${this.inAction ? "await " : ""}${b.code}(${this.fnArgs(b.fn, e.items, sc)})`, type: "any" };
    if (b?.kind === "value") {
      const args = e.items.map((it) => (it.type === "ExprItem" ? this.expr(it.expr, sc).code : it.type === "Prop" ? `${this.expr(it.value, sc).code}` : "undefined"));
      return { code: `${b.code}(${args.join(", ")})`, type: "any" };
    }
    if (b?.kind === "comp") {
      this.err("L1003", `\`${name}\` is a ${b.comp.kind === "page" ? "Page" : "Widget"}; use it as an object in the layout.`, e.span);
      return { code: "null", type: "obj" };
    }
    // Widget constructors inside expressions (e.g. assigning an obj): compile inline.
    if (!b && (widget(name) || this.project.widgets.has(name))) {
      this.err("L1007", `\`${name}(...)\` here is an object; objects belong in the layout tree or in \`.obj\` injections.`, e.span, "warning");
      return { code: "null", type: "obj" };
    }
    // Gradients
    if (name === "LinearGradient" || name === "RadialGradient" || name === "ConicGradient" || name === "AngularGradient") return this.gradient(name, e, sc);
    const builtin = VALUE_BUILTINS[name];
    if (builtin) return this.builtin(name, builtin.code, e, sc, expect);
    this.err("L1005", `Unknown function \`${name}\`.`, callee.span);
    return { code: "undefined", type: "any" };
  }

  private fnArgs(fn: FunctionDef, items: Item[], sc: Scope): string {
    const args: string[] = ["$ctx"];
    const positional = exprItems(items);
    const named = new Map(items.filter((i): i is Prop => i.type === "Prop").map((p) => [p.key, p.value] as const));
    fn.params.forEach((p, i) => {
      const e = named.get(p.name) ?? positional[i];
      if (!e) {
        if (p.required) this.err("L1008", `\`${fn.name}\` needs \`${p.name}\`.`, items[0]?.span ?? fn.call.span);
        args.push("undefined");
        return;
      }
      if (p.ref && e.type === "Ident") {
        const b = sc.lookup(e.name);
        if (b?.kind === "signal") {
          args.push(b.code);
          return;
        }
        this.err("L1003", `\`${p.name}\` is a ref param; pass a var.`, e.span);
      }
      args.push(this.expr(e, sc, { type: p.type ? normalizeType(p.type) : undefined }).code);
    });
    if (!this.inAction) return args.map((a, i) => (i === 0 ? "$.detached()" : a)).join(", ");
    return args.join(", ");
  }

  private builtin(name: string, code: string, e: Call, sc: Scope, expect: Expect): Gen {
    const pos = exprItems(e.items);
    const props = e.items.filter((i): i is Prop => i.type === "Prop");
    const lenArg = (x: Expr) => this.expr(x, sc, { type: "len" });
    switch (name) {
      case "all": {
        const a = pos[0] ? lenArg(pos[0]) : { code: "0", type: "int", konst: 0 };
        return { code: `$V.all(${a.code})`, type: "insets", konst: isConst(a) ? all(a.konst as number) : NOT_CONST };
      }
      case "sym": {
        const xs = props.find((p) => p.key === "x")?.value ?? pos[0];
        const ys = props.find((p) => p.key === "y")?.value ?? pos[1];
        const x = xs ? lenArg(xs) : { code: "0", type: "int", konst: 0 };
        const y = ys ? lenArg(ys) : { code: "0", type: "int", konst: 0 };
        return { code: `$V.sym(${x.code}, ${y.code})`, type: "insets", konst: isConst(x) && isConst(y) ? sym(x.konst as number, y.konst as number) : NOT_CONST };
      }
      case "only": {
        if (pos.length) this.err("L1003", "`only(...)` takes named sides: `only(left: 20, top: 8)`.", e.span);
        const sides = ["left", "right", "top", "bottom", "start", "end", "topLeft", "topRight", "bottomLeft", "bottomRight"];
        const parts: string[] = [];
        const kv: Record<string, unknown> = {};
        let allConst = true;
        for (const p of props) {
          if (!sides.includes(p.key)) this.err("L1002", `\`only\` has no side \`${p.key}\`.`, p.keySpan);
          const g = lenArg(p.value);
          const k = { topLeft: "top", topRight: "right", bottomRight: "bottom", bottomLeft: "left" }[p.key] ?? p.key;
          parts.push(`${k}: ${g.code}`);
          if (isConst(g)) kv[k] = g.konst;
          else allConst = false;
        }
        return { code: `$V.only({ ${parts.join(", ")} })`, type: "insets", konst: allConst ? only(kv as never) : NOT_CONST };
      }
      case "shadow":
      case "border": {
        const parts: string[] = [];
        const kv: Record<string, unknown> = {};
        let allConst = true;
        for (const p of props) {
          const g = this.expr(p.value, sc, p.key === "color" ? { type: "color" } : p.key === "align" ? { type: "enum", values: ["in", "mid", "out"] } : p.key === "inset" ? { type: "bool" } : p.key === "style" ? { type: "enum", values: ["solid", "dashed", "dotted"] } : { type: "len" });
          parts.push(`${p.key}: ${g.code}`);
          if (isConst(g)) kv[p.key] = g.konst;
          else allConst = false;
        }
        const konst = allConst ? (name === "shadow" ? shadow(kv) : border(kv)) : NOT_CONST;
        return { code: `$V.${name}({ ${parts.join(", ")} })`, type: name, konst };
      }
      case "rgb":
      case "rgba":
      case "rgbo": {
        const args = pos.map((x) => this.expr(x, sc));
        const konst = args.every(isConst) ? new Color(args[0]?.konst as number, args[1]?.konst as number, args[2]?.konst as number, (args[3]?.konst as number | undefined) ?? 1) : NOT_CONST;
        if (name === "rgbo") report(this.mod, "L1011", "`rgbo` is written `rgba`.", e.callee.span, "info", { fixes: [{ title: "Use rgba", edits: [{ span: e.callee.span, text: "rgba" }] }] });
        return { code: `$V.rgb(${args.map((a) => a.code).join(", ")})`, type: "color", konst };
      }
      case "size": {
        const args = pos.map((x) => lenArg(x));
        return { code: `$V.size(${args.map((a) => a.code).join(", ")})`, type: "size", konst: args.every(isConst) ? sizeValue(args[0]?.konst as number, args[1]?.konst as number) : NOT_CONST };
      }
      case "px": {
        const a = pos[0] ? this.expr(pos[0], sc) : { code: "0", type: "int", konst: 0 };
        return { code: `$V.px(${a.code})`, type: "len", konst: isConst(a) ? px(a.konst as number) : NOT_CONST };
      }
      case "slide": {
        const parts = props.map((p) => `${p.key}: ${this.expr(p.value, sc, { type: "len" }).code}`);
        return { code: `$V.motion.slide({ ${parts.join(", ")} })`, type: "motion" };
      }
      case "go": {
        const target = pos[0];
        const params = props.map((p) => `${JSON.stringify(p.key)}: ${this.expr(p.value, sc).code}`);
        return { code: `$.go(${target ? this.pageRef(target, sc) : "null"}, { ${params.join(", ")} })`, type: "void" };
      }
      case "wait": {
        const d = pos[0] ? this.expr(pos[0], sc, { type: "time" }).code : "0";
        if (!this.inAction) this.err("L1003", "`wait` only works inside actions.", e.span);
        return { code: `await $ctx.wait(${d})`, type: "void" };
      }
      default: {
        const args = pos.map((x) => this.expr(x, sc).code);
        void expect;
        return { code: `${code}(${args.join(", ")})`, type: VALUE_BUILTINS[name]?.type ?? "any" };
      }
    }
  }

  private gradient(name: string, e: Call, sc: Scope): Gen {
    const kind = name === "LinearGradient" ? "linear" : name === "RadialGradient" ? "radial" : "conic";
    if (name === "AngularGradient") report(this.mod, "L1011", "`AngularGradient` is written `ConicGradient`.", e.callee.span, "info");
    const colorsMod = firstModifier(e.items, "colors");
    const colors = exprItems(colorsMod?.items ?? null).map((x) => this.expr(x, sc, { type: "color" }));
    if (!colors.length) this.err("L1008", `\`${name}\` needs \`.colors(...)\`.`, e.span);
    const stops = exprItems(firstModifier(e.items, "stops")?.items ?? null).map((x) => this.expr(x, sc));
    const dir = exprItems(firstModifier(e.items, "direction")?.items ?? null).map((x) => this.expr(x, sc, { type: "align" }));
    const center = exprItems(firstModifier(e.items, "center")?.items ?? null).map((x) => this.expr(x, sc, { type: "align" }));
    const angle = exprItems(firstModifier(e.items, "angle")?.items ?? null).map((x) => this.expr(x, sc));
    const from = dir[0] ?? center[0];
    const to = dir[1];
    const opts: string[] = [];
    if (stops.length) opts.push(`stops: [${stops.map((s) => s.code).join(", ")}]`);
    if (from) opts.push(`from: ${from.code}`);
    if (to) opts.push(`to: ${to.code}`);
    if (angle[0]) opts.push(`angle: ${angle[0].code}`);
    const code = `$V.gradient(${JSON.stringify(kind)}, [${colors.map((c) => c.code).join(", ")}], { ${opts.join(", ")} })`;
    const allConst = [...colors, ...stops, ...dir, ...center, ...angle].every(isConst);
    const konst = allConst
      ? gradient(kind, colors.map((c) => c.konst as Color), {
          stops: stops.length ? stops.map((s) => s.konst as number) : undefined,
          from: from?.konst as string | undefined,
          to: to?.konst as string | undefined,
          angle: angle[0]?.konst as number | undefined,
        })
      : NOT_CONST;
    return { code, type: "paint", konst };
  }
}

// ------------------------------------------------------------------ helpers

/** Builtins visible inside `{ }` TypeScript bodies. */
const TS_BUILTINS: Record<string, string> = {
  print: "console.log",
  go: "$.go",
  back: "$.back",
  wait: "$ctx.wait",
  all: "$V.all",
  sym: "$V.sym",
  only: "$V.only",
  rgb: "$V.rgb",
  hsl: "$V.hsl",
  px: "$V.px",
  pct: "$V.pct",
  shadow: "$V.shadow",
  spring: "$V.spring",
  ease: "$V.ease",
};

/** Keys that drive runtime behaviour or content rather than CSS; always passed to the runtime node. */
const BEHAVIOUR_KEYS = new Set([
  "className",
  "label", "value", "options", "placeholder", "open", "modal", "dismissible", "disabled", "kind", "multiline", "rows",
  "min", "max", "step", "required", "src", "poster", "captions", "autoplay", "loop", "muted", "controls", "name",
  "to", "href", "external", "submit", "auto", "ring", "trap", "backdrop", "placement", "duration", "ease", "delay",
  "motion", "resize", "alt", "decorative", "lazy", "type", "overflow", "stackAt", "values", "stops", "direction", "blurOn", "mode", "selectable",
]);

interface Seg {
  name: string;
  index?: number;
  span: Span;
}

function flatten(e: Expr): Seg[] | null {
  if (e.type === "Ident") return [{ name: e.name, span: e.span }];
  if (e.type === "Member") {
    const base = flatten(e.object);
    return base ? [...base, { name: e.name, span: e.nameSpan }] : null;
  }
  if (e.type === "Call" && e.items.length === 1) {
    const arg = e.items[0];
    if (arg?.type === "ExprItem" && arg.expr.type === "Number" && arg.expr.unit === "") {
      const base = flatten(e.callee);
      if (!base) return null;
      const last = base[base.length - 1] as Seg;
      return [...base.slice(0, -1), { name: last.name, index: arg.expr.value, span: { start: last.span.start, end: e.span.end } }];
    }
  }
  return null;
}

/** Suggestions for an unknown key, matching aliases too (`widht` → `w` via `width`). */
function suggestKeys(def: WidgetDef, written: string): string[] {
  const byName = new Map<string, string>();
  for (const k of def.keys) {
    byName.set(k.name, k.name);
    for (const a of k.aliases ?? []) byName.set(a, k.name);
  }
  return [...new Set(suggest(written, byName.keys()).map((n) => byName.get(n) as string))];
}

function featureKey(node: ObjNode, name: string): string | null {
  if (RENDERED_FEATURES[name]) return name;
  if (name === "obj") return "obj";
  if (node.def) {
    const k = keyOf(node.def, name);
    if (k) return k.name;
    const g = node.def.groups?.find((x) => x.name === name);
    if (g) return name;
  }
  if (node.user) {
    const p = node.user.params.find((x) => x.name === name);
    if (p) return p.name;
  }
  if (node.kind === "foreign") return name;
  return null;
}

function canonicalKey(node: ObjNode, key: string): string {
  if (node.def) return keyOf(node.def, key)?.name ?? key;
  return key;
}

function featureType(node: ObjNode | null, key: string): string {
  if (key === "size") return "size";
  if (key === "visible") return "bool";
  const k = node?.def ? keyOf(node.def, key) : undefined;
  return k?.type === "len" ? "len" : (k?.type ?? "any");
}

function stateBinding(kind: "var" | "const" | "bind", name: string, type: string | null, immutable: boolean): Binding {
  if (kind === "var") return { kind: "signal", code: name, type, immutable };
  if (kind === "bind") return { kind: "computed", code: name, type };
  return { kind: "value", code: name, type };
}

function bodyScope(sc: Scope) {
  return {
    lookup(name: string) {
      const b = sc.lookup(name);
      if (!b) {
        // LAYR builtins that make sense in TypeScript bodies.
        const builtin = TS_BUILTINS[name];
        return builtin ? { kind: "value" as const, code: builtin } : null;
      }
      switch (b.kind) {
        case "signal":
          return { kind: "signal" as const, code: b.code };
        case "computed":
          return { kind: "computed" as const, code: b.code };
        case "value":
          return { kind: "value" as const, code: b.code };
        case "function":
          return { kind: "value" as const, code: `((...a) => ${b.code}($ctx, ...a))` };
        case "object":
          return { kind: "object" as const, code: name, address: runtimeAddress(b.comp, b.node) };
        case "params":
          return { kind: "value" as const, code: "$p" };
        case "comp":
          return { kind: "value" as const, code: JSON.stringify(b.comp.name) };
        default:
          return null;
      }
    },
  };
}

function collectNames(sc: Scope | null): string[] {
  const out: string[] = [];
  for (let s = sc; s; s = s.parent) out.push(...s.map.keys());
  return out;
}

function declaredNames(code: string): string[] {
  const out: string[] = [];
  const re = /\b(?:const|let|var)\s+(?:\{([^}]*)\}|\[([^\]]*)\]|([A-Za-z_$][\w$]*))/g;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    const list = m[1] ?? m[2];
    if (list) {
      for (const part of list.split(",")) {
        const name = part.split(":").pop()?.split("=")[0]?.trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) out.push(name);
      }
    } else if (m[3]) out.push(m[3]);
  }
  return out;
}

function spanAt(block: Block, offset: number): Span {
  const s = block.codeStart + offset;
  return { start: s, end: s + 1 };
}

function isConst(g: Gen | undefined): boolean {
  return !!g && g.konst !== undefined && g.konst !== NOT_CONST;
}

function evalArith(op: string, a: number, b: number): number {
  return op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b;
}

export function normalizeType(t: string): string {
  const map: Record<string, string> = { double: "num", float: "num", number: "num", string: "txt", text: "txt", object: "obj", widget: "obj", padding: "insets", margin: "insets", boolean: "bool", length: "len", duration: "time" };
  return map[t] ?? t;
}

function defaultFor(t: string): string {
  switch (normalizeType(t)) {
    case "int":
    case "num":
    case "len":
    case "time":
      return "0";
    case "txt":
      return '""';
    case "bool":
      return "false";
    case "list":
      return "[]";
    default:
      return "null";
  }
}

/**
 * Whether an object fills its row: its own `w: fill`, a fill primitive, a user widget whose root
 * fills (unless the caller sets `w`), or a pass-through wrapper around a filling object.
 */
function fills(k: ObjNode, depth = 0): boolean {
  if (depth > 6) return false;
  if (k.name === "Expand" || k.name === "Mid" || k.name === "Align") return true;
  const w = k.config.find((e) => e.key === "w" || e.key === "width");
  if (w) return w.value.type === "Ident" && w.value.name === "fill";
  if (k.kind === "user" && k.user?.root) return fills(k.user.root, depth + 1);
  if (k.name === "Animate" || k.name === "Focus" || k.name === "Position") {
    const inner = [...k.children.values()].flat().find((c) => c.kind === "node");
    return inner ? fills((inner as { node: ObjNode }).node, depth + 1) : false;
  }
  return false;
}

function describeType(t: string): string {
  const d: Record<string, string> = { len: "a length", num: "a number", int: "an integer", txt: "text", bool: "true/false", color: "a colour", paint: "a colour or gradient", align: "an alignment", axis: "an axis alignment", insets: "insets (all/sym/only)", size: "a size", radius: "a radius", shadow: "a shadow", time: "a duration", enum: "one of the listed values", sizing: "fill/hug", list: "a list", object: "an object reference", obj: "an object" };
  return d[t] ?? t;
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function defaultRoute(path: string, name: string): string {
  const m = path.match(/(?:^|\/)pages\/(.+)\.layr$/);
  if (!m) return `/${name.toLowerCase()}`;
  const route = (m[1] as string).replace(/(^|\/)index$/, "").replace(/\[(\w+)\]/g, ":$1");
  return `/${route}`;
}

export function globMatch(glob: string, path: string): boolean {
  const re = new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\/?/g, "§").replace(/\*/g, "[^/]*").replace(/§/g, ".*")}$`);
  return re.test(path);
}
