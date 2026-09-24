/**
 * Project analysis: modules, definitions (Pages, Widgets, Functions, state), and the object tree
 * of every Page/Widget. Object trees give every object a stable address for lookup paths, ids,
 * Export/Extract/Inject and devtools.
 */
import { DEFAULT_DESIGN_SCALE, type DesignScaleConfig, widget, type WidgetDef } from "@layr-internal/model";
import type { Block, Call, Decl, Expr, FileNode, Import, Item, Modifier, Prop } from "./ast.ts";
import { CONSTRUCT_NAMES, lowerFirst, pascal, suggest } from "./names.ts";
import { parse } from "./parser.ts";
import { type Diagnostic, SourceFile, type Span } from "./source.ts";

export interface ProjectConfig {
  designScale: DesignScaleConfig;
  theme: { colors: Record<string, string>; dark: Record<string, string>; fonts: Record<string, string> };
  access: { inject: "default" | "open"; force: string[] };
  targets: string[];
  /** Module specifiers the generated code imports. */
  runtime: string;
  values: string;
  /** Installed LAYR addons: package name → project-relative path of its entry `.layr` file. */
  addons: Record<string, string>;
  /** Put every object's lookup path on its element (`data-path`) for inspectors and tests. */
  inspect?: boolean;
}

export const DEFAULT_CONFIG: ProjectConfig = {
  designScale: DEFAULT_DESIGN_SCALE,
  theme: { colors: {}, dark: {}, fonts: {} },
  access: { inject: "default", force: [] },
  targets: ["react"],
  runtime: "@dynshift/layr/react",
  values: "@dynshift/layr/runtime",
  addons: {},
};

export type CompKind = "page" | "widget";

export interface ParamDef {
  name: string;
  type: string | null;
  optional: boolean;
  required: boolean;
  immutable: boolean;
  ref: boolean;
  init: Expr | null;
  decl: Decl;
}

export interface FunctionDef {
  name: string;
  params: ParamDef[];
  body: Modifier | null;
  call: Call;
  module: Module;
  owner: CompDef | null;
}

export interface StateDef {
  name: string;
  kind: "var" | "const" | "bind";
  type: string | null;
  init: Expr | null;
  immutable: boolean;
  exported: boolean;
  decl: Decl;
}

export interface EEIDef {
  kind: "Extract" | "Inject" | "Export";
  call: Call;
  owner: CompDef | null;
  module: Module;
}

export interface CompDef {
  kind: CompKind;
  name: string;
  nameSpan: Span;
  call: Call | null;
  module: Module;
  params: ParamDef[];
  state: StateDef[];
  functions: FunctionDef[];
  eei: EEIDef[];
  route: string | null;
  meta: Prop[];
  load: Block | null;
  /** `.paths { ... }`: the params of a dynamic route to prerender. */
  paths: Block | null;
  react: Block | null;
  stateMode: "keep" | "reset";
  rootCall: Call | null;
  root: ObjNode | null;
  ids: Map<string, ObjNode>;
  anonymous: boolean;
  /** `.export(id: group, type name = self.feature)` groups: group → member → feature. */
  exportGroups: Map<string, Map<string, { node: ObjNode; key: string; span: Span }>>;
}

export interface ConfigEntry {
  key: string;
  written: string;
  value: Expr;
  immutable: boolean;
  step: boolean;
  span: Span;
  keySpan: Span;
}

export type NodeKind = "core" | "user" | "foreign" | "construct";

export interface ObjNode {
  call: Call;
  kind: NodeKind;
  /** Canonical widget name (core/user) or the imported local name (foreign). */
  name: string;
  def: WidgetDef | null;
  user: CompDef | null;
  id: string | null;
  idSpan: Span | null;
  seg: string;
  parent: ObjNode | null;
  slot: string;
  index: number;
  children: Map<string, Child[]>;
  config: ConfigEntry[];
  at: Array<{ frame: string; frameSpan: Span; entries: ConfigEntry[] }>;
  modifiers: Map<string, Modifier[]>;
  address: string;
  comp: CompDef;
}

export type Child = { kind: "node"; node: ObjNode } | { kind: "expr"; expr: Expr; item: Item } | { kind: "forward"; span: Span };

export interface Module {
  path: string;
  source: SourceFile;
  ast: FileNode;
  imports: Import[];
  /** Local name → resolved `.layr` module path for layr imports. */
  layrImports: Map<string, { module: string; name: string }>;
  foreign: Map<string, { source: string; kind: "default" | "named" | "namespace"; name: string }>;
  state: StateDef[];
  functions: FunctionDef[];
  comps: CompDef[];
  eei: EEIDef[];
  presets: Call[];
  app: Call | null;
  diagnostics: Diagnostic[];
}

export interface Project {
  config: ProjectConfig;
  modules: Map<string, Module>;
  widgets: Map<string, CompDef>;
  pages: Map<string, CompDef>;
  diagnostics: Diagnostic[];
}

// ------------------------------------------------------------------ helpers

export function identName(e: Expr | undefined | null): string | null {
  return e && e.type === "Ident" ? e.name : null;
}

export function modifiers(items: Item[], name: string): Modifier[] {
  return items.filter((i): i is Modifier => i.type === "Modifier" && i.name === name);
}

export function firstModifier(items: Item[], name: string): Modifier | undefined {
  return items.find((i): i is Modifier => i.type === "Modifier" && i.name === name);
}

export function exprItems(items: Item[] | null): Expr[] {
  return (items ?? []).filter((i) => i.type === "ExprItem").map((i) => (i as { expr: Expr }).expr);
}

function calleeName(c: Call): string | null {
  return identName(c.callee);
}

function stringValue(e: Expr | undefined): string | null {
  if (!e || e.type !== "String") return null;
  return e.parts.every((p) => typeof p === "string") ? (e.parts as string[]).join("") : null;
}

function resolvePath(from: string, spec: string): string {
  const base = from.split("/").slice(0, -1);
  for (const part of spec.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") base.pop();
    else base.push(part);
  }
  return base.join("/");
}

function typeName(d: Decl): string | null {
  return d.typeRef?.name ?? null;
}

// ------------------------------------------------------------------ analysis

export function analyzeProject(files: Array<{ path: string; text: string }>, config: ProjectConfig = DEFAULT_CONFIG): Project {
  const project: Project = { config, modules: new Map(), widgets: new Map(), pages: new Map(), diagnostics: [] };
  for (const f of files) {
    const path = f.path.replace(/\\/g, "/");
    const source = new SourceFile(path, f.text);
    const r = parse(f.text);
    const mod: Module = {
      path,
      source,
      ast: r.file,
      imports: [],
      layrImports: new Map(),
      foreign: new Map(),
      state: [],
      functions: [],
      comps: [],
      eei: [],
      presets: [],
      app: null,
      diagnostics: r.diagnostics.map((d) => ({ ...d, file: path })),
    };
    collectModule(mod);
    project.modules.set(path, mod);
  }
  // Index widgets and pages project-wide.
  for (const mod of project.modules.values()) {
    for (const c of mod.comps) {
      const index = c.kind === "page" ? project.pages : project.widgets;
      const prev = index.get(c.name);
      if (prev) report(mod, "L1010", `\`${c.name}\` is already defined in ${prev.module.path}.`, c.nameSpan);
      else index.set(c.name, c);
    }
  }
  // Resolve imports.
  for (const mod of project.modules.values()) {
    for (const imp of mod.imports) {
      const addonEntry = project.config.addons[imp.source];
      if (imp.source.endsWith(".layr") || addonEntry) {
        const target = addonEntry ?? resolvePath(mod.path, imp.source);
        const tm = project.modules.get(target);
        if (!tm) {
          report(mod, "L1005", `Cannot find module \`${imp.source}\`.`, imp.span);
          continue;
        }
        if (imp.defaultName) {
          const anon = tm.comps.find((c) => c.anonymous) ?? tm.comps.find((c) => c.kind === "widget") ?? tm.comps[0];
          if (anon) mod.layrImports.set(imp.defaultName, { module: target, name: anon.name });
        }
        for (const n of imp.named) mod.layrImports.set(n.alias, { module: target, name: n.name });
      } else {
        if (imp.defaultName) mod.foreign.set(imp.defaultName, { source: imp.source, kind: "default", name: "default" });
        if (imp.namespace) mod.foreign.set(imp.namespace, { source: imp.source, kind: "namespace", name: "*" });
        for (const n of imp.named) mod.foreign.set(n.alias, { source: imp.source, kind: "named", name: n.name });
      }
    }
  }
  // Build object trees.
  for (const mod of project.modules.values()) {
    for (const c of mod.comps) {
      if (c.rootCall) c.root = buildTree(project, mod, c, c.rootCall, null, "obj", 0);
    }
  }
  return project;
}

export function report(mod: Module, code: string, message: string, span: Span, severity: Diagnostic["severity"] = "error", extra: Partial<Diagnostic> = {}) {
  mod.diagnostics.push({ code, severity, message, span, file: mod.path, ...extra });
}

function stateFrom(d: Decl): StateDef | null {
  if (d.kind !== "var" && d.kind !== "const" && d.kind !== "bind") return null;
  return { name: d.name, kind: d.kind, type: typeName(d), init: d.init, immutable: d.immutable, exported: d.exported, decl: d };
}

function paramFrom(d: Decl): ParamDef {
  return {
    name: d.name,
    type: typeName(d),
    optional: d.typeRef?.optional ?? false,
    required: d.required,
    immutable: d.immutable,
    ref: d.ref,
    init: d.init,
    decl: d,
  };
}

function collectModule(mod: Module) {
  for (const item of mod.ast.items) {
    if (item.type === "Import") {
      mod.imports.push(item);
      continue;
    }
    if (item.type === "Decl") {
      const s = stateFrom(item);
      if (s) mod.state.push(s);
      else report(mod, "L0011", "Only `var`, `const` and `bind` declarations are allowed at file level.", item.span);
      continue;
    }
    if (item.type !== "ExprItem" || item.expr.type !== "Call") {
      if (item.type === "ExprItem" && item.expr.type === "Missing") continue;
      report(mod, "L0011", "Expected a Page, Widget, Function, declaration or object at file level.", item.span);
      continue;
    }
    const call = item.expr;
    const name = calleeName(call);
    switch (name) {
      case "Page":
      case "Widget":
        mod.comps.push(collectComp(mod, call, name === "Page" ? "page" : "widget"));
        break;
      case "Function":
        mod.functions.push(collectFunction(mod, call, null));
        break;
      case "Var": {
        const s = varCall(mod, call);
        if (s) mod.state.push(s);
        break;
      }
      case "Extract":
      case "Inject":
      case "Export":
        mod.eei.push({ kind: name, call, owner: null, module: mod });
        break;
      case "Preset":
        mod.presets.push(call);
        break;
      case "App":
        mod.app = call;
        break;
      case "DesignScale":
      case "Theme":
        // Standalone definitions at file level are folded into App by the config loader.
        break;
      default: {
        // A file whose body is one object is an anonymous widget named after the file.
        if (mod.comps.some((c) => c.anonymous)) {
          report(mod, "L1014", "A file can hold only one anonymous root object; wrap others in a Widget.", call.span);
          break;
        }
        const nameFromFile = pascal(mod.path.split("/").pop() ?? "Widget");
        const comp = emptyComp(mod, "widget", nameFromFile, call.span, null);
        comp.anonymous = true;
        comp.rootCall = call;
        mod.comps.push(comp);
      }
    }
  }
}

/** `Var(int, index, 0)` from the notes → `var int index = 0`. */
function varCall(mod: Module, call: Call): StateDef | null {
  const args = exprItems(call.items);
  const [t, n, v] = args;
  const tname = identName(t);
  const name = identName(n);
  if (!tname || !name) {
    report(mod, "L1008", "`Var(type, name, value)` needs a type and a name.", call.span);
    return null;
  }
  const decl: Decl = {
    type: "Decl",
    kind: "var",
    typeRef: { type: "TypeRef", name: tname, args: [], optional: false, span: (t as Expr).span },
    name,
    nameSpan: (n as Expr).span,
    init: v ?? null,
    exported: false,
    immutable: false,
    required: false,
    ref: false,
    span: call.span,
  };
  report(mod, "L1011", "`Var(type, name, value)` is written `var type name = value` in canonical form.", call.span, "info", {
    fixes: [{ title: "Use a var declaration", edits: [{ span: call.span, text: `var ${tname} ${name}${v ? ` = ${mod.source.slice(v.span)}` : ""}` }] }],
  });
  return { name, kind: "var", type: tname, init: v ?? null, immutable: false, exported: false, decl };
}

function emptyComp(mod: Module, kind: CompKind, name: string, nameSpan: Span, call: Call | null): CompDef {
  return {
    kind,
    name,
    nameSpan,
    call,
    module: mod,
    params: [],
    state: [],
    functions: [],
    eei: [],
    route: null,
    meta: [],
    load: null,
    paths: null,
    react: null,
    stateMode: "keep",
    rootCall: null,
    root: null,
    ids: new Map(),
    anonymous: false,
    exportGroups: new Map(),
  };
}

function collectComp(mod: Module, call: Call, kind: CompKind): CompDef {
  const nameMod = firstModifier(call.items, "name") ?? firstModifier(call.items, "namme");
  const nameExpr = exprItems(nameMod?.items ?? null)[0];
  const name = identName(nameExpr) ?? stringValue(nameExpr) ?? "";
  if (!name) report(mod, kind === "page" ? "L1013" : "L1014", `A ${kind === "page" ? "Page" : "Widget"} needs \`.name(...)\`.`, call.span);
  if (nameMod?.name === "namme") report(mod, "L1011", "`.namme` is written `.name`.", nameMod.nameSpan, "info");
  const comp = emptyComp(mod, kind, name || "Anonymous", nameExpr?.span ?? call.span, call);
  for (const item of call.items) {
    if (item.type === "Modifier") {
      switch (item.name) {
        case "name":
        case "namme":
          break;
        case "route": {
          const r = stringValue(exprItems(item.items)[0]);
          if (r === null) report(mod, "L1003", "`.route` takes a path string, e.g. `.route('/demo/:id')`.", item.span);
          comp.route = r;
          break;
        }
        case "meta":
          comp.meta = (item.items ?? []).filter((i): i is Prop => i.type === "Prop");
          break;
        case "load":
          comp.load = item.block;
          break;
        case "paths":
          comp.paths = item.block;
          break;
        case "react":
          comp.react = item.block;
          break;
        case "state": {
          const v = identName(exprItems(item.items)[0]);
          if (v === "reset" || v === "keep") comp.stateMode = v;
          else report(mod, "L1004", "`.state` takes `keep` or `reset`.", item.span);
          break;
        }
        case "param":
          for (const p of item.items ?? []) {
            if (p.type === "Decl") comp.params.push(paramFrom(p));
            else report(mod, "L0011", "Params are written `type name` or `req type name = default`.", p.span);
          }
          break;
        case "obj":
        case "body":
          if (kind === "widget") {
            const root = exprItems(item.items)[0];
            if (root?.type === "Call") comp.rootCall = root;
            else report(mod, "L1014", "`.obj(...)` of a Widget must be one object.", item.span);
          } else report(mod, "L1006", "A Page's root object is written directly inside the Page.", item.span);
          break;
        case "var":
        case "const":
          for (const d of item.items ?? []) if (d.type === "Decl") comp.state.push({ ...(stateFrom({ ...d, kind: item.name as "var" }) as StateDef) });
          break;
        case "scale":
        case "on":
          break;
        default:
          report(mod, "L1006", `\`${kind === "page" ? "Page" : "Widget"}\` has no modifier \`.${item.name}\`.`, item.nameSpan);
      }
      continue;
    }
    if (item.type === "Decl") {
      const s = stateFrom(item);
      if (s) comp.state.push(s);
      else report(mod, "L0011", "Only `var`, `const` and `bind` declarations are allowed here.", item.span);
      continue;
    }
    if (item.type === "ExprItem" && item.expr.type === "Call") {
      const inner = item.expr;
      const n = calleeName(inner);
      if (n === "Function") comp.functions.push(collectFunction(mod, inner, comp));
      else if (n === "Var") {
        const s = varCall(mod, inner);
        if (s) comp.state.push(s);
      } else if (n === "Extract" || n === "Inject" || n === "Export") comp.eei.push({ kind: n, call: inner, owner: comp, module: mod });
      else if (kind === "page") {
        if (comp.rootCall) report(mod, "L1013", "A Page has exactly one root object (usually a Scaffold).", inner.span);
        else comp.rootCall = inner;
      } else report(mod, "L1014", "A Widget's object goes in `.obj(...)`.", inner.span);
      continue;
    }
    if (item.type === "ExprItem" && item.expr.type === "Missing") continue;
    report(mod, "L0011", "Unexpected item in a definition.", item.span);
  }
  if (!comp.rootCall) report(mod, kind === "page" ? "L1013" : "L1014", `${kind === "page" ? "Page" : "Widget"} \`${comp.name}\` has no root object.`, call.span);
  return comp;
}

function collectFunction(mod: Module, call: Call, owner: CompDef | null): FunctionDef {
  const nameMod = firstModifier(call.items, "name") ?? firstModifier(call.items, "namme");
  const name = identName(exprItems(nameMod?.items ?? null)[0]) ?? "";
  if (!name) report(mod, "L1008", "A Function needs `.name(...)`.", call.span);
  const params: ParamDef[] = [];
  const pm = firstModifier(call.items, "param") ?? firstModifier(call.items, "var");
  for (const p of pm?.items ?? []) if (p.type === "Decl") params.push(paramFrom(p));
  const body = firstModifier(call.items, "def") ?? null;
  if (!body) report(mod, "L1008", "A Function needs a body: `.def(...)` or `.def { ... }`.", call.span);
  return { name, params, body, call, module: mod, owner };
}

// ------------------------------------------------------------------ object trees

const PASS_MODIFIERS = new Set(["id", "preset", "config", "at", "export", "fnc", "on", "a11y", "props", "slot", "eases", "enter", "exit", "key"]);

export function classify(project: Project, mod: Module, name: string): { kind: NodeKind; name: string; def: WidgetDef | null; user: CompDef | null } | null {
  const layr = mod.layrImports.get(name);
  if (layr) {
    const target = project.modules.get(layr.module);
    const c = target?.comps.find((x) => x.name === layr.name) ?? project.widgets.get(layr.name);
    if (c) return { kind: "user", name: c.name, def: null, user: c };
  }
  const local = mod.comps.find((c) => c.kind === "widget" && c.name === name);
  if (local) return { kind: "user", name, def: null, user: local };
  // An explicit import wins over a core widget of the same name (`import { Icon } from './icons.tsx'`).
  if (mod.foreign.has(name)) return { kind: "foreign", name, def: null, user: null };
  const core = widget(name);
  if (core) return { kind: "core", name: core.name, def: core, user: null };
  if (name === "If" || name === "Each" || name === "DesignScale") return { kind: "construct", name, def: null, user: null };
  const pw = project.widgets.get(name);
  if (pw) return { kind: "user", name, def: null, user: pw };
  return null;
}

function buildTree(project: Project, mod: Module, comp: CompDef, call: Call, parent: ObjNode | null, slot: string, index: number): ObjNode | null {
  let name = calleeName(call);
  let foreignNs = false;
  if (!name && call.callee.type === "Member" && call.callee.object.type === "Ident" && mod.foreign.has(call.callee.object.name)) {
    name = `${call.callee.object.name}.${call.callee.name}`;
    foreignNs = true;
  }
  if (!name) {
    report(mod, "L1001", "Expected a widget name.", call.callee.span);
    return null;
  }
  const cls = foreignNs ? { kind: "foreign" as const, name, def: null, user: null } : classify(project, mod, name);
  if (!cls) {
    const candidates = [...new Set([...(project.widgets.keys() as Iterable<string>), ...["Container", "Row", "Column", "Stack", "Text", "Button", "Image", "Scaffold", "Mid", "Gap"]])];
    const s = suggest(name, candidates);
    report(mod, "L1001", `Unknown widget \`${name}\`.${s.length ? ` Did you mean ${s.map((x) => `\`${x}\``).join(", ")}?` : ""}`, call.callee.span);
    return null;
  }
  if (cls.kind === "core" && name !== cls.name) {
    report(mod, "L1011", `\`${name}\` is written \`${cls.name}\`.`, call.callee.span, "info", {
      fixes: [{ title: `Rename to ${cls.name}`, edits: [{ span: call.callee.span, text: cls.name }] }],
    });
  }
  const node: ObjNode = {
    call,
    kind: cls.kind,
    name: cls.name,
    def: cls.def,
    user: cls.user,
    id: null,
    idSpan: null,
    seg: lowerFirst(cls.name.split(".").pop() as string),
    parent,
    slot,
    index,
    children: new Map(),
    config: [],
    at: [],
    modifiers: new Map(),
    address: "",
    comp,
  };
  const def = cls.def;
  // Identity first: children derive their addresses from this node's address.
  const idMod = firstModifier(call.items, "id");
  if (idMod) {
    const idExpr = exprItems(idMod.items)[0];
    const id = identName(idExpr);
    if (!id) report(mod, "L1003", "`.id(...)` takes a name.", idMod.span);
    else {
      node.id = id;
      node.idSpan = idExpr?.span ?? idMod.span;
      const prev = comp.ids.get(id);
      if (prev) report(mod, "L1009", `Duplicate id \`${id}\` in ${comp.name}.`, node.idSpan);
      else comp.ids.set(id, node);
    }
  }
  const parentDefault = parent ? (parent.def?.slots.find((s) => s.default)?.name ?? "obj") : "obj";
  const slotPart = parent && slot !== parentDefault ? `${slot}.` : "";
  node.address = node.id ?? `${parent ? `${parent.address}.` : ""}${slotPart}${node.seg}(${index})`;
  const defaultSlot = def?.slots.find((s) => s.default)?.name ?? "obj";
  const slotNames = new Set(def?.slots.map((s) => s.name) ?? []);
  const counters = new Map<string, Map<string, number>>();
  const addChild = (slotName: string, c: Child) => {
    const list = node.children.get(slotName) ?? [];
    list.push(c);
    node.children.set(slotName, list);
  };
  const addNodeChild = (slotName: string, childCall: Call) => {
    const probe = calleeName(childCall);
    if (probe && (VALUE_CALLS.has(probe) || isFunctionName(mod, comp, probe))) {
      addChild(slotName, { kind: "expr", expr: childCall, item: { type: "ExprItem", expr: childCall, span: childCall.span } });
      return;
    }
    const segName = lowerFirst((classify(project, mod, probe ?? "")?.name ?? probe ?? "x").split(".").pop() as string);
    const bySlot = counters.get(slotName) ?? new Map<string, number>();
    counters.set(slotName, bySlot);
    const i = bySlot.get(segName) ?? 0;
    bySlot.set(segName, i + 1);
    const child = buildTree(project, mod, comp, childCall, node, slotName, i);
    if (child) addChild(slotName, { kind: "node", node: child });
  };
  const addExprChild = (slotName: string, item: Item & { type: "ExprItem" }) => {
    const e = item.expr;
    if (e.type === "Call" && (calleeName(e) || (e.callee.type === "Member" && e.callee.object.type === "Ident" && mod.foreign.has(e.callee.object.name)))) addNodeChild(slotName, e);
    else if (e.type === "DotRef" && e.name === "obj") addChild(slotName, { kind: "forward", span: e.span });
    else if (e.type !== "Missing") addChild(slotName, { kind: "expr", expr: e, item });
  };

  const collectConfig = (items: Item[] | null, into: ConfigEntry[], inGroup: string | null = null) => {
    for (const it of items ?? []) {
      if (it.type === "Prop") {
        const flat = inGroup ? (def?.groups?.find((g) => g.name === inGroup)?.keys[it.key] ?? `${inGroup}${it.key.charAt(0).toUpperCase()}${it.key.slice(1)}`) : it.key;
        into.push({ key: flat, written: inGroup ? flat : it.key, value: it.value, immutable: it.immutable, step: it.step, span: it.span, keySpan: it.keySpan });
      } else if (it.type === "Modifier" && it.items) {
        collectConfig(it.items, into, it.name);
      } else report(mod, "L0011", "Config holds `key: value` entries and groups like `.border(...)`.", it.span);
    }
  };

  for (const item of call.items) {
    if (item.type === "Modifier") {
      const list = node.modifiers.get(item.name) ?? [];
      list.push(item);
      node.modifiers.set(item.name, list);
      if (item.name === "config") collectConfig(item.items, node.config);
      else if (item.name === "id") {
        // resolved above
      } else if (item.name === "at") {
        const [frameExpr, ...rest] = item.items ?? [];
        const frame = frameExpr?.type === "ExprItem" ? identName(frameExpr.expr) : null;
        if (!frame) report(mod, "L1015", "`.at(frame, key: value, ...)` needs a frame name first.", item.span);
        else {
          if (!project.config.designScale.frames.some((f) => f.name === frame))
            report(mod, "L1015", `Unknown frame \`${frame}\`. Frames: ${project.config.designScale.frames.map((f) => f.name).join(", ")}.`, frameExpr?.span ?? item.span);
          const entries: ConfigEntry[] = [];
          collectConfig(rest, entries);
          node.at.push({ frame, frameSpan: (frameExpr as Item).span, entries });
        }
      } else if (node.kind !== "construct" && (item.name === "obj" || item.name === "objs" || slotNames.has(item.name))) {
        const slotName = item.name === "obj" || item.name === "objs" ? defaultSlot : item.name;
        for (const sub of item.items ?? []) {
          if (sub.type === "ExprItem") addExprChild(slotName, sub);
          else report(mod, "L1007", `\`.${item.name}\` holds objects.`, sub.span);
        }
      } else if (def?.keys.some((k) => k.modifier && k.name === item.name)) {
        const v = exprItems(item.items)[0];
        if (v) node.config.push({ key: item.name, written: item.name, value: v, immutable: false, step: false, span: item.span, keySpan: item.nameSpan });
      } else if (node.kind === "construct" || PASS_MODIFIERS.has(item.name) || node.kind === "foreign" || node.kind === "user") {
        // handled by the emitter
      } else {
        const known = [...PASS_MODIFIERS, ...(def?.slots.map((s) => s.name) ?? []), ...(def?.keys.filter((k) => k.modifier).map((k) => k.name) ?? [])];
        const s = suggest(item.name, known);
        report(mod, "L1006", `\`${node.name}\` has no modifier \`.${item.name}\`.${s.length ? ` Did you mean ${s.map((x) => `\`.${x}\``).join(", ")}?` : ""}`, item.nameSpan);
      }
      continue;
    }
    if (item.type === "Prop") {
      if (node.kind === "construct") continue;
      node.config.push({ key: item.key, written: item.key, value: item.value, immutable: item.immutable, step: item.step, span: item.span, keySpan: item.keySpan });
      continue;
    }
    if (item.type === "ExprItem") {
      if (node.kind === "construct") continue;
      addExprChild(defaultSlot, item);
      continue;
    }
    report(mod, "L0011", "Unexpected item in an object.", item.span);
  }

  // `.export(id: group, type name = self.feature)`: named feature groups (the notes' Export form).
  for (const m of node.modifiers.get("export") ?? []) {
    const groupProp = (m.items ?? []).find((i): i is Prop => i.type === "Prop" && i.key === "id");
    const group = identName(groupProp?.value) ?? node.id;
    if (!group) {
      report(mod, "L1008", "`.export(...)` needs `id: name` (or the object needs an `.id`).", m.span);
      continue;
    }
    const members = comp.exportGroups.get(group) ?? new Map();
    for (const it of m.items ?? []) {
      if (it.type === "Decl" && it.init) {
        let e: Expr = it.init;
        const path: string[] = [];
        while (e.type === "Member") {
          path.unshift(e.name);
          e = e.object;
        }
        const root = identName(e);
        if (!root || !(root === "self" || root === node.seg || root === node.id) || !path[0]) {
          report(mod, "L3301", "Export members read features of the object itself: `type name = self.feature` (or its widget name, e.g. `container.size`).", it.span);
          continue;
        }
        members.set(it.name, { node, key: path[0] as string, span: it.span });
      } else if (it.type === "ExprItem" && it.expr.type === "Ident") {
        members.set(it.expr.name, { node, key: it.expr.name, span: it.span });
      }
    }
    comp.exportGroups.set(group, members);
  }

  // Constructs (If/Each/DesignScale) keep their child objects in their modifiers.
  if (node.kind === "construct") {
    for (const m of ["obj", "fb", "then"]) {
      for (const mm of node.modifiers.get(m) ?? []) for (const sub of mm.items ?? []) if (sub.type === "ExprItem") addExprChild(m, sub);
    }
  }

  return node;
}

const VALUE_CALLS = new Set(["all", "sym", "only", "rgb", "rgba", "rgbo", "hsl", "shadow", "border", "LinearGradient", "RadialGradient", "ConicGradient", "AngularGradient", "size", "px"]);

function isFunctionName(mod: Module, comp: CompDef, name: string): boolean {
  return comp.functions.some((f) => f.name === name) || mod.functions.some((f) => f.name === name) || (!!name && /^[a-z]/.test(name) && !CONSTRUCT_NAMES.has(name) && mod.foreign.has(name));
}

/** Depth-first walk of an object tree. */
export function walk(node: ObjNode | null, f: (n: ObjNode) => void) {
  if (!node) return;
  f(node);
  for (const list of node.children.values()) for (const c of list) if (c.kind === "node") walk(c.node, f);
}

/**
 * The lookup path a developer writes for a node (`Demo.scaffold.body.row.column(1)`): lowercase
 * widget names, non-default slots, `(n)` only among same-type siblings, and an id in place of the
 * path above it.
 */
export function lookupPath(comp: CompDef, node: ObjNode): string {
  const segs: string[] = [];
  for (let x: ObjNode | null = node; x; x = x.parent) {
    if (x.id) {
      segs.unshift(x.id);
      break;
    }
    const same = x.parent ? (x.parent.children.get(x.slot) ?? []).filter((c) => c.kind === "node" && c.node.seg === x?.seg) : [];
    // Named slots read like the docs (`scaffold.body`); the generic `obj`/`objs` slots are implied.
    const named = x.parent && x.slot !== "obj" && x.slot !== "objs";
    segs.unshift(`${named ? `${x.slot}.` : ""}${x.seg}${same.length > 1 ? `(${x.index})` : ""}`);
  }
  return `${comp.name}.${segs.join(".")}`;
}

export function runtimeAddress(comp: CompDef, node: ObjNode): string {
  return `${comp.name}::${node.address}`;
}
