/**
 * The LAYR language service: diagnostics, completion, hover, definitions, symbols and formatting
 * over an in-memory project. Transport-free, so the LSP server, the MCP server and the playground
 * share it.
 */
import { type CompileResult, compileProject, type Diagnostic, format, type ProjectConfig, SourceFile, type Span } from "@layr-internal/compiler";
import {
  AXIS_VALUES,
  COMMON_MODIFIERS,
  CONSTRUCTS,
  DIAGNOSTIC_BY_CODE,
  type KeyDef,
  keyOf,
  MODIFIER_ORDER,
  NAMED_COLORS,
  widget,
  WIDGETS,
  type WidgetDef,
} from "@layr-internal/model";

export type CompletionKind = "widget" | "construct" | "modifier" | "key" | "value" | "frame" | "keyword" | "id" | "color";

export interface Completion {
  label: string;
  kind: CompletionKind;
  detail?: string;
  doc?: string;
  insert?: string;
  /** `insert` is an LSP snippet (`Container($0)`: the closing bracket comes with it, the cursor goes inside). */
  snippet?: boolean;
}

/** What a construct's completion writes: its essential modifiers with tab stops. */
const CONSTRUCT_SNIPPETS: Record<string, string> = {
  Page: "Page(\n\t.name(${1:Home})\n\t.route('/${2}')\n\t$0\n)",
  Widget: "Widget(\n\t.name(${1:Card})\n\t.wgt($0)\n)",
  Function: "Function(.name(${1:run}) .def($0))",
  Extract: "Extract(.from(${1:Page.id}) $0)",
  Inject: "Inject(.into(${1:Page.id}) $0)",
  Export: "Export(.from(${1:Page.id}) $0)",
  If: "If(.cnd(${1:test}) $0)",
  Each: "Each(.of(${1:list}) .as(${2:item}) $0)",
  Repeat: "Repeat(.times(${1:3}) $0)",
  Duplicate: "Duplicate(.id(${1:copy}) .from(${2:id}))",
  Preset: "Preset(.name(${1:primary}) .for(${2:Button}) .config($0))",
};
/** Widgets whose object is text: the cursor lands inside the quotes. */
const TEXT_SNIPPETS = new Set(["Text", "RichText", "Icon"]);

export interface Hover {
  markdown: string;
  span: Span;
}

export interface Location {
  path: string;
  span: Span;
}

export interface SymbolInfo {
  name: string;
  kind: "page" | "widget" | "function" | "state";
  span: Span;
  children?: SymbolInfo[];
}

const KEYWORDS = ["var", "const", "bind", "export", "req", "ref", "import", "true", "false", "null"];
const SAPI_STEPS = ["if", "cnd", "exe", "fb", "wait", "loop", "times", "while", "call", "go"];

export class LayrService {
  private readonly files = new Map<string, string>();
  /** The compile of the current texts, or null after an edit until something needs it again. */
  private result: CompileResult | null = null;
  /** The last compile, kept across edits: completion and hover read the project's shape from it without recompiling. */
  private last: CompileResult | null = null;
  private readonly lines = new Map<string, { text: string; source: SourceFile }>();
  private config: Partial<ProjectConfig>;

  constructor(config: Partial<ProjectConfig> = {}) {
    this.config = config;
  }

  setConfig(config: Partial<ProjectConfig>) {
    this.config = config;
    this.result = null;
  }

  setFile(path: string, text: string) {
    if (this.files.get(path) === text) return;
    this.files.set(path, text);
    this.result = null;
  }

  removeFile(path: string) {
    this.files.delete(path);
    this.lines.delete(path);
    this.result = null;
  }

  text(path: string): string | undefined {
    return this.files.get(path);
  }

  paths(): string[] {
    return [...this.files.keys()];
  }

  /** Compiles the current texts (diagnostics, formatting, upgrades need this). */
  compile(): CompileResult {
    if (!this.result) {
      this.result = compileProject([...this.files].map(([path, text]) => ({ path, text })), this.config);
      this.last = this.result;
    }
    return this.result;
  }

  /**
   * The project as last compiled, for questions about its shape (widgets, ids, params, theme) that
   * an edit in progress rarely changes; compiles only when nothing has been compiled yet.
   */
  analysis(): CompileResult {
    return this.result ?? this.last ?? this.compile();
  }

  diagnostics(path: string): Diagnostic[] {
    return this.compile().modules.get(path)?.diagnostics ?? [];
  }

  format(path: string): string | null {
    const t = this.files.get(path);
    if (t === undefined) return null;
    const r = format(t);
    return r.errors ? null : r.text;
  }

  // ---------------------------------------------------------------- context

  /** The chain of open calls/modifiers around `offset`, innermost first: e.g. [".config", "Container"]. */
  context(text: string, offset: number): string[] {
    const chain: string[] = [];
    let depth = 0;
    let i = offset - 1;
    while (i >= 0) {
      const ch = text[i] as string;
      if (ch === "'" || ch === '"' || ch === "`") {
        // skip string backwards
        i--;
        while (i >= 0 && text[i] !== ch) i--;
        i--;
        continue;
      }
      if (ch === "}") {
        let d = 1;
        i--;
        while (i >= 0 && d > 0) {
          if (text[i] === "}") d++;
          else if (text[i] === "{") d--;
          i--;
        }
        continue;
      }
      if (ch === ")") depth++;
      else if (ch === "(") {
        if (depth === 0) {
          let j = i - 1;
          while (j >= 0 && /[A-Za-z0-9_$]/.test(text[j] as string)) j--;
          const name = text.slice(j + 1, i);
          chain.push(text[j] === "." ? `.${name}` : name);
        } else depth--;
      } else if (ch === "{" && depth === 0) {
        chain.push("{");
        return chain;
      }
      i--;
    }
    return chain;
  }

  private ownerWidget(chain: string[]): WidgetDef | null {
    for (const c of chain) {
      if (c.startsWith(".")) continue;
      const w = widget(c);
      if (w) return w;
      return null;
    }
    return null;
  }

  // ---------------------------------------------------------------- completion

  /** True while completing a name that a `(` already follows: complete the name alone. */
  private parenFollows = false;

  /** `name(…)` as a snippet with the cursor inside, or just the name when a `(` is already there. */
  private call(name: string, inside = "$0", prefix = ""): Pick<Completion, "insert" | "snippet"> {
    return this.parenFollows ? { insert: `${prefix}${name}` } : { insert: `${prefix}${name}(${inside})`, snippet: true };
  }

  complete(path: string, offset: number): Completion[] {
    const text = this.files.get(path) ?? "";
    this.parenFollows = /^[A-Za-z0-9_$]*\(/.test(text.slice(offset));
    const before = text.slice(0, offset);
    const word = (before.match(/[A-Za-z0-9_$]*$/) as RegExpMatchArray)[0];
    const lead = before.slice(0, before.length - word.length);
    const chain = this.context(text, offset - word.length);
    if (chain[0] === "{") return [];
    const inner = chain[0];
    const owner = this.ownerWidget(chain);
    const project = this.analysis().project;

    // After a dot: modifiers, or members of a value.
    if (lead.endsWith(".") && !/[A-Za-z0-9_)\]'"]\.$/.test(lead.slice(-2))) {
      return this.modifierCompletions(owner, inner);
    }
    if (/[A-Za-z0-9_$)]\.$/.test(lead)) {
      // member access: ids of the page, features of objects, colour methods
      const obj = (lead.match(/([A-Za-z0-9_$]+)\.$/) as RegExpMatchArray | null)?.[1];
      if (obj && (obj in NAMED_COLORS || obj.startsWith("#"))) return ["alpha", "shade", "tint", "invert", "mix"].map((m) => ({ label: m, kind: "value" }));
      if (obj === "spring") return ["gentle", "snappy", "bounce", "slow"].map((m) => ({ label: m, kind: "value" }));
      if (obj === "ease") return ["linear", "in", "out", "inOut", "emphasized"].map((m) => ({ label: m, kind: "value" }));
      const comp = project.pages.get(obj ?? "") ?? project.widgets.get(obj ?? "");
      if (comp?.root) return [{ label: comp.root.seg, kind: "id" }, ...[...comp.ids.keys()].map((id) => ({ label: id, kind: "id" as const, detail: `${comp.name}.${id}` }))];
      return ["size", "pos", "visible", "obj"].map((f) => ({ label: f, kind: "key" as const, detail: "feature" }));
    }

    // Value position: after `key:` inside a config.
    const valueKey = (before.match(/([A-Za-z0-9_]+)\s*:\s*[A-Za-z0-9_$]*$/) as RegExpMatchArray | null)?.[1];
    if (valueKey && owner && (inner === ".config" || inner === owner.name || inner?.startsWith(".at"))) {
      const k = keyOf(owner, valueKey);
      if (k) return this.valueCompletions(k);
    }

    // `.at(` first argument: frames.
    if (inner === ".at" && !/,/.test(text.slice(text.lastIndexOf("(", offset) + 1, offset))) {
      return this.analysis().project.config.designScale.frames.map((f) => ({ label: f.name, kind: "frame" as const, detail: `${f.w}×${f.h} from ${f.from}px` }));
    }

    // Keys inside .config(...) (or shorthand props in a widget call).
    if (owner && (inner === ".config" || inner?.startsWith(".at") || inner === owner.name || (owner.groups ?? []).some((g) => `.${g.name}` === inner))) {
      const group = owner.groups?.find((g) => `.${g.name}` === inner);
      if (group) return Object.keys(group.keys).map((k) => ({ label: k, kind: "key", insert: `${k}: ` }));
      const keys = owner.keys.map((k) => this.keyCompletion(k));
      const groups = (owner.groups ?? []).map((g) => ({ label: g.name, kind: "modifier" as const, detail: "group", doc: g.doc, ...this.call(g.name, "$0", ".") }));
      return inner === owner.name ? [...keys, ...this.widgetCompletions(path)] : [...keys, ...groups];
    }

    // Object positions: widgets, constructs, local widgets, keywords.
    return [...this.widgetCompletions(path), ...KEYWORDS.map((k) => ({ label: k, kind: "keyword" as const }))];
  }

  private keyCompletion(k: KeyDef): Completion {
    return { label: k.name, kind: "key", detail: k.type + (k.default ? ` = ${k.default}` : ""), doc: k.doc, insert: `${k.name}: ` };
  }

  private valueCompletions(k: KeyDef): Completion[] {
    if (k.values?.length) return k.values.map((v) => ({ label: v, kind: "value" }));
    if (k.type === "axis") return AXIS_VALUES.map((v) => ({ label: v, kind: "value" }));
    if (k.type === "align") return ["topLeft", "topMid", "topRight", "midLeft", "mid", "midRight", "bottomLeft", "bottomMid", "bottomRight"].map((v) => ({ label: v, kind: "value" }));
    if (k.type === "color" || k.type === "paint") {
      const theme = Object.keys(this.analysis().project.config.theme.colors).map((c) => ({ label: c, kind: "color" as const, detail: "theme" }));
      return [...theme, ...Object.keys(NAMED_COLORS).map((c) => ({ label: c, kind: "color" as const })), { label: "LinearGradient", kind: "value", ...this.call("LinearGradient", ".colors(${1:red}, ${2:blue})$0") }];
    }
    if (k.type === "insets") return ["all", "sym", "only"].map((f) => ({ label: f, kind: "value", ...this.call(f) }));
    if (k.type === "motion") return ["spring.gentle", "spring.snappy", "spring.bounce", "ease.inOut", "ease.out"].map((v) => ({ label: v, kind: "value" }));
    if (k.type === "shadow") return [{ label: "shadow", kind: "value", ...this.call("shadow", "y: ${1:4}, blur: ${2:12}") }];
    if (k.type === "bool") return ["true", "false"].map((v) => ({ label: v, kind: "value" }));
    return [];
  }

  private modifierCompletions(owner: WidgetDef | null, inner: string | undefined): Completion[] {
    if (inner === ".def" || inner === ".fnc" || inner === ".if" || inner === ".fb" || inner === ".loop" || inner === ".exe") return SAPI_STEPS.map((s) => ({ label: s, kind: "modifier", ...this.call(s) }));
    const construct = CONSTRUCTS.find((c) => c.name === inner);
    if (construct) return construct.modifiers.map((m) => ({ label: m, kind: "modifier", ...this.call(m) }));
    const mods = new Set<string>(COMMON_MODIFIERS);
    for (const s of owner?.slots ?? []) mods.add(s.name);
    for (const k of owner?.keys ?? []) if (k.modifier) mods.add(k.name);
    if (owner?.name === "Animate") for (const m of ["eases", "enter", "exit"]) mods.add(m);
    return [...mods].sort((a, b) => rank(a) - rank(b)).map((m) => ({ label: m, kind: "modifier" as const, ...this.call(m) }));
  }

  private widgetCompletions(path: string): Completion[] {
    const project = this.analysis().project;
    const own = [...project.widgets.values()].map((w) => ({ label: w.name, kind: "widget" as const, detail: `widget · ${w.module.path}`, ...this.call(w.name) }));
    const core = WIDGETS.map((w) => ({ label: w.name, kind: "widget" as const, detail: w.module, doc: w.doc, ...this.call(w.name, TEXT_SNIPPETS.has(w.name) ? "'$0'" : "$0") }));
    const constructs = CONSTRUCTS.map((c) => {
      const s = CONSTRUCT_SNIPPETS[c.name];
      return { label: c.name, kind: "construct" as const, doc: c.doc, ...(s && !this.parenFollows ? { insert: s, snippet: true } : this.call(c.name)) };
    });
    void path;
    return [...core, ...own, ...constructs];
  }

  // ---------------------------------------------------------------- hover

  hover(path: string, offset: number): Hover | null {
    const text = this.files.get(path) ?? "";
    const w = wordAt(text, offset);
    if (!w) return null;
    // Only a compile of the current text has spans that match it.
    const diag = this.result?.modules.get(path)?.diagnostics.find((d) => d.span.start <= offset && offset <= d.span.end);
    const lines: string[] = [];
    if (diag) {
      const def = DIAGNOSTIC_BY_CODE.get(diag.code);
      lines.push(`**${diag.code}** ${diag.message}`, def ? `\n${def.explain}` : "", `\n[layr explain ${diag.code}](https://layr.dynshift.com/errors/${diag.code})`, "\n---\n");
    }
    const before = text.slice(0, w.span.start);
    const isModifier = before.endsWith(".");
    const chain = this.context(text, w.span.start);
    const owner = this.ownerWidget(chain);
    const core = widget(w.text);
    if (core && !isModifier) {
      lines.push(`**${core.name}** · ${core.module}`, "", core.doc, "", "```layr", core.example, "```");
      if (core.name !== w.text) lines.push(`\n\`${w.text}\` is an alias; canonical: \`${core.name}\``);
      return { markdown: lines.join("\n"), span: w.span };
    }
    const construct = CONSTRUCTS.find((c) => c.name === w.text);
    if (construct && !isModifier) {
      lines.push(`**${construct.name}**`, "", construct.doc, "", "```layr", construct.example, "```");
      return { markdown: lines.join("\n"), span: w.span };
    }
    const after = text.slice(w.span.end).trimStart();
    if (owner && after.startsWith(":")) {
      const k = keyOf(owner, w.text);
      if (k) {
        lines.push(`**${owner.name}.${k.name}**: \`${k.type}\`${k.default ? ` = \`${k.default}\`` : ""}`, "", k.doc);
        if (k.values?.length) lines.push("", `Values: ${k.values.map((v) => `\`${v}\``).join(", ")}`);
        if (k.name !== w.text) lines.push("", `\`${w.text}\` is an alias of \`${k.name}\`.`);
        return { markdown: lines.join("\n"), span: w.span };
      }
    }
    const project = this.analysis().project;
    const comp = project.widgets.get(w.text) ?? project.pages.get(w.text);
    if (comp) {
      lines.push(`**${comp.name}** · ${comp.kind} · ${comp.module.path}`);
      if (comp.params.length) lines.push("", comp.params.map((p) => `- \`${p.required ? "req " : ""}${p.type ?? "any"} ${p.name}\``).join("\n"));
      return { markdown: lines.join("\n"), span: w.span };
    }
    if (diag) return { markdown: lines.join("\n"), span: diag.span };
    return null;
  }

  // ---------------------------------------------------------------- definition

  definition(path: string, offset: number): Location | null {
    const text = this.files.get(path) ?? "";
    const w = wordAt(text, offset);
    if (!w) return null;
    const project = this.compile().project;
    const comp = project.widgets.get(w.text) ?? project.pages.get(w.text);
    if (comp) return { path: comp.module.path, span: comp.nameSpan };
    // ids anywhere in the project (current file first)
    const mods = [...project.modules.values()].sort((a, b) => (a.path === path ? -1 : b.path === path ? 1 : 0));
    for (const mod of mods) {
      for (const c of mod.comps) {
        const node = c.ids.get(w.text);
        if (node?.idSpan) return { path: mod.path, span: node.idSpan };
        for (const f of c.functions) if (f.name === w.text) return { path: mod.path, span: f.call.span };
        for (const s of c.state) if (s.name === w.text) return { path: mod.path, span: s.decl.nameSpan };
      }
      for (const f of mod.functions) if (f.name === w.text) return { path: mod.path, span: f.call.span };
      for (const s of mod.state) if (s.name === w.text) return { path: mod.path, span: s.decl.nameSpan };
    }
    return null;
  }

  /** Every Export/Extract/Inject reference to a feature of the object at `offset` (find injectors). */
  references(path: string, offset: number): Array<Location & { kind: string; key: string; order: number | null }> {
    const text = this.files.get(path) ?? "";
    const w = wordAt(text, offset);
    if (!w) return [];
    const r = this.compile();
    const addr = [...r.project.modules.values()].flatMap((m) => m.comps.flatMap((c) => (c.ids.has(w.text) ? [`${c.name}::${w.text}`] : [])));
    return r.graph.entries.filter((e) => addr.includes(e.address)).map((e) => ({ path: e.file, span: e.span, kind: e.kind, key: e.key, order: e.order }));
  }

  symbols(path: string): SymbolInfo[] {
    const mod = this.compile().project.modules.get(path);
    if (!mod) return [];
    const out: SymbolInfo[] = [];
    for (const c of mod.comps) {
      out.push({
        name: c.name,
        kind: c.kind,
        span: c.call?.span ?? c.nameSpan,
        children: [...c.state.map((s) => ({ name: s.name, kind: "state" as const, span: s.decl.span })), ...c.functions.map((f) => ({ name: f.name, kind: "function" as const, span: f.call.span }))],
      });
    }
    for (const f of mod.functions) out.push({ name: f.name, kind: "function", span: f.call.span });
    for (const s of mod.state) out.push({ name: s.name, kind: "state", span: s.decl.span });
    return out;
  }

  /** Line table of a file's current text, rebuilt only when the text changed. */
  private source(path: string): SourceFile {
    const text = this.files.get(path) ?? "";
    const hit = this.lines.get(path);
    if (hit && hit.text === text) return hit.source;
    const source = new SourceFile(path, text);
    this.lines.set(path, { text, source });
    return source;
  }

  position(path: string, offset: number) {
    return this.source(path).position(offset);
  }

  offset(path: string, line: number, column: number) {
    return this.source(path).offset({ line, column });
  }
}

function rank(m: string): number {
  const i = MODIFIER_ORDER.indexOf(m);
  return i < 0 ? 100 : i;
}

export function wordAt(text: string, offset: number): { text: string; span: Span } | null {
  let s = offset;
  let e = offset;
  while (s > 0 && /[A-Za-z0-9_$]/.test(text[s - 1] as string)) s--;
  while (e < text.length && /[A-Za-z0-9_$]/.test(text[e] as string)) e++;
  if (s === e) return null;
  return { text: text.slice(s, e), span: { start: s, end: e } };
}
