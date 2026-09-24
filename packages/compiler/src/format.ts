/**
 * `layr format`: one canonical form for every program.
 *
 * - aliases → canonical names (widgets, keys, alignments, steps, colour methods, builtins)
 * - modifier order: identity → preset → params → config → frames → export → motion → logic → objects
 * - config keys: dimensions first, then alphabetical; groups sort by name
 * - shorthand (one line) when it fits; otherwise one item per line, with props gathered into `.config`
 * - comments are kept; formatting is idempotent; files with syntax errors are left untouched
 */
import { canonicalAlign, keyOf, MODIFIER_ORDER, SIZE_KEYS, widget, type WidgetDef } from "@layr-internal/model";
import type { Block, Call, Decl, Expr, FileNode, Import, Item, Modifier, Prop, StringLit, TypeRef } from "./ast.ts";
import { BUILTIN_ALIASES, COLOR_METHOD_ALIASES } from "./names.ts";
import { parse } from "./parser.ts";

export interface FormatOptions {
  width?: number;
  indent?: string;
}

const DIMENSIONS = SIZE_KEYS.map((k) => k.name);
const STEP_ALIASES: Record<string, string> = { exc: "exe", lookUp: "from", namme: "name" };
const TYPE_ALIASES: Record<string, string> = { double: "num", float: "num", number: "num", string: "txt", text: "txt", object: "obj", widget: "obj", boolean: "bool", padding: "insets", margin: "insets", length: "len", duration: "time" };
const ALIGN_KEYS = new Set(["objAlign", "to", "position", "placement", "align"]);

export function format(text: string, opts: FormatOptions = {}): { text: string; changed: boolean; errors: number } {
  const r = parse(text);
  const errors = r.diagnostics.filter((d) => d.severity === "error").length;
  if (errors) return { text, changed: false, errors };
  const f = new Formatter(opts.width ?? 100, opts.indent ?? "  ", text);
  const out = f.file(r.file);
  return { text: out, changed: out !== text, errors: 0 };
}

class Formatter {
  private readonly width: number;
  private readonly unit: string;
  private readonly src: string;

  constructor(width: number, unit: string, src: string) {
    this.width = width;
    this.unit = unit;
    this.src = src;
  }

  /** True when the source had a blank line between two items (kept, at most one). */
  private blankBetween(a: Item | undefined, b: Item): boolean {
    if (!a) return false;
    const start = b.leading?.length ? this.src.lastIndexOf(b.leading[0] as string, b.span.start) : b.span.start;
    const gap = this.src.slice(a.span.end, start < 0 ? b.span.start : start);
    return /\n[ \t]*\r?\n/.test(gap.replace(/\/\/[^\n]*/g, ""));
  }

  /**
   * Items on one line: after a modifier a space is enough; after a value the next item needs a
   * comma, because `120 .border(...)` would read as a method call on `120`.
   */
  private joinOne(parts: Array<{ it: Item; text: string }>): string {
    let out = "";
    parts.forEach((p, i) => {
      if (i > 0) out += parts[i - 1]?.it.type === "Modifier" ? " " : ", ";
      out += p.text;
    });
    return out;
  }

  /** Multi-line items with blank lines preserved. */
  private lines(items: Item[], ind: string, owner: WidgetDef | null, group?: string): string {
    return items.map((it, i) => `${i > 0 && this.blankBetween(items[i - 1], it) ? "\n" : ""}${this.itemWithTriviaOwner(it, ind, owner, group)}`).join("\n");
  }

  /** A single multi-line call as the only item hugs its parent: `Mid(Column(` … `))`. */
  private hug(items: Item[], ind: string): string | null {
    if (items.length !== 1) return null;
    const only = items[0] as Item;
    if (only.type !== "ExprItem" || only.expr.type !== "Call" || only.leading?.length || only.trailing || only.after?.length) return null;
    return this.call(only.expr, ind);
  }

  file(f: FileNode): string {
    const parts: string[] = [];
    let prevKind = "";
    let prev: Item | undefined;
    for (const item of f.items) {
      const kind = item.type === "Import" ? "import" : item.type === "Decl" ? "decl" : "block";
      const text = this.itemWithTrivia(item, "");
      if (parts.length) parts.push(kind === prevKind && kind !== "block" && !this.blankBetween(prev, item) ? "\n" : "\n\n");
      parts.push(text);
      prevKind = kind;
      prev = item;
    }
    if (f.dangling?.length) parts.push(`${parts.length ? "\n\n" : ""}${f.dangling.join("\n")}`);
    return `${parts.join("")}\n`;
  }

  private itemWithTrivia(item: Item, ind: string): string {
    const lead = (item.leading ?? []).map((c) => `${ind}${c.trim()}\n`).join("");
    const body = this.item(item, ind);
    const trail = item.trailing ? ` ${item.trailing.trim()}` : "";
    const after = (item.after ?? []).map((c) => `\n${ind}${c.trim()}`).join("");
    return `${lead}${ind}${body}${trail}${after}`;
  }

  // ---------------------------------------------------------------- items

  private item(item: Item, ind: string, owner?: WidgetDef | null, group?: string): string {
    switch (item.type) {
      case "Import":
        return this.import(item);
      case "Decl":
        return this.decl(item, ind);
      case "Prop":
        return this.prop(item, ind, owner ?? null, group);
      case "Modifier":
        return this.modifier(item, ind, owner ?? null);
      case "ExprItem":
        return this.expr(item.expr, ind);
    }
  }

  private import(i: Import): string {
    const parts: string[] = [];
    if (i.defaultName) parts.push(i.defaultName);
    if (i.namespace) parts.push(`* as ${i.namespace}`);
    if (i.named.length) parts.push(`{ ${i.named.map((n) => (n.name === n.alias ? n.name : `${n.name} as ${n.alias}`)).join(", ")} }`);
    if (!parts.length) return `import '${i.source}'`;
    return `import ${i.typeOnly ? "type " : ""}${parts.join(", ")} from '${i.source}'`;
  }

  private type(t: TypeRef): string {
    const name = TYPE_ALIASES[t.name] ?? t.name;
    return `${name}${t.args.length ? `<${t.args.map((a) => this.type(a)).join(", ")}>` : ""}${t.optional ? "?" : ""}`;
  }

  private decl(d: Decl, ind: string): string {
    const words: string[] = [];
    if (d.exported) words.push("export");
    if (d.required) words.push("req");
    if (d.ref) words.push("ref");
    if (d.immutable) words.push("!mut");
    if (d.kind === "var" || d.kind === "const" || d.kind === "bind") words.push(d.kind);
    if (d.typeRef) words.push(this.type(d.typeRef));
    words.push(d.name);
    return `${words.join(" ")}${d.init ? ` = ${this.expr(d.init, ind)}` : ""}`;
  }

  private prop(p: Prop, ind: string, owner: WidgetDef | null, group?: string): string {
    let key = p.key;
    if (owner && !group) key = keyOf(owner, p.key)?.name ?? p.key;
    const prefix = `${p.immutable ? "!mut " : ""}${p.step ? "step " : ""}`;
    let value = this.expr(p.value, ind);
    if (owner && ALIGN_KEYS.has(key) && p.value.type === "Ident") value = canonicalAlign(p.value.name) ?? value;
    return `${prefix}${key}: ${value}`;
  }

  private modifier(m: Modifier, ind: string, owner: WidgetDef | null): string {
    const name = STEP_ALIASES[m.name] ?? m.name;
    const block = m.block ? ` ${this.block(m.block, ind)}` : "";
    if (m.items === null) return `.${name}${block}`;
    let items = m.items;
    if (name === "config" && owner) items = sortConfig(items, owner);
    const isGroup = !!owner?.groups?.some((g) => g.name === name);
    const inner = items.map((it) => ({ it, one: this.itemOneLine(it, owner, isGroup ? name : undefined) }));
    const oneLine = `.${name}(${this.joinOne(inner.map((x) => ({ it: x.it, text: x.one })))})`;
    const hasComments = items.some((it) => it.leading?.length || it.trailing || it.after?.length);
    if (!hasComments && inner.every((x) => !x.one.includes("\n")) && ind.length + oneLine.length + block.length <= this.width) return `${oneLine}${block}`;
    const hugged = this.hug(items, ind);
    if (hugged) return `.${name}(${hugged})${block}`;
    const nested = `${ind}${this.unit}`;
    return `.${name}(\n${this.lines(items, nested, owner, isGroup ? name : undefined)}\n${ind})${block}`;
  }

  private itemWithTriviaOwner(item: Item, ind: string, owner: WidgetDef | null, group?: string): string {
    const lead = (item.leading ?? []).map((c) => `${ind}${c.trim()}\n`).join("");
    const body = this.item(item, ind, owner, group);
    const trail = item.trailing ? ` ${item.trailing.trim()}` : "";
    const after = (item.after ?? []).map((c) => `\n${ind}${c.trim()}`).join("");
    return `${lead}${ind}${body}${trail}${after}`;
  }

  private itemOneLine(item: Item, owner: WidgetDef | null, group?: string): string {
    return this.item(item, "", owner, group);
  }

  private block(b: Block, ind: string): string {
    const code = b.code;
    if (!code.includes("\n")) return `{ ${code.trim()} }`;
    const lines = code.replace(/^\s*\n/, "").replace(/\n\s*$/, "").split("\n");
    const minIndent = Math.min(...lines.filter((l) => l.trim()).map((l) => (l.match(/^\s*/) as RegExpMatchArray)[0].length));
    const body = lines.map((l) => (l.trim() ? `${ind}${this.unit}${l.slice(minIndent)}` : "")).join("\n");
    return `{\n${body}\n${ind}}`;
  }

  // ---------------------------------------------------------------- expressions

  expr(e: Expr, ind: string): string {
    switch (e.type) {
      case "Ident":
        return BUILTIN_ALIASES[e.name] ?? e.name;
      case "Number":
        return e.raw;
      case "String":
        return this.string(e);
      case "Color":
        return `#${e.hex.toLowerCase()}`;
      case "Tuple":
        return `(${e.elements.map((x) => this.expr(x, ind)).join(", ")})`;
      case "List":
        return `[${e.elements.map((x) => this.expr(x, ind)).join(", ")}]`;
      case "Member": {
        const name = COLOR_METHOD_ALIASES[e.name] ?? e.name;
        return `${this.expr(e.object, ind)}${e.optional ? "?." : "."}${name}`;
      }
      case "Index":
        return `${this.expr(e.object, ind)}[${this.expr(e.index, ind)}]`;
      case "Call":
        return this.call(e, ind);
      case "Unary":
        return `${e.op}${this.expr(e.argument, ind)}`;
      case "Update":
        return `${this.expr(e.argument, ind)}${e.op}`;
      case "NonNull":
        return `${this.expr(e.argument, ind)}!`;
      case "Binary":
        return `${this.expr(e.left, ind)} ${e.op} ${this.expr(e.right, ind)}`;
      case "Ternary":
        return `${this.expr(e.test, ind)} ? ${this.expr(e.consequent, ind)} : ${this.expr(e.alternate, ind)}`;
      case "Assign":
        return `${this.expr(e.target, ind)} ${e.op} ${this.expr(e.value, ind)}`;
      case "Arrow":
        return `(${e.params.map((p) => p.name).join(", ")}) => ${this.expr(e.body, ind)}`;
      case "Paren":
        return `(${this.expr(e.expr, ind)})`;
      case "DotRef":
        return `.${e.name}`;
      case "Block":
        return this.block(e, ind);
      case "Missing":
        return "";
    }
  }

  private string(s: StringLit): string {
    const raw = s.raw;
    if (s.quote === '"' && !raw.includes("'")) return `'${raw.replace(/\\"/g, '"')}'`;
    return `${s.quote}${raw}${s.quote}`;
  }

  private call(c: Call, ind: string): string {
    let callee = this.expr(c.callee, ind);
    const def = c.callee.type === "Ident" ? widget(c.callee.name) : undefined;
    if (def) callee = def.name;
    let items = c.items;
    if (def) items = orderItems(items, def);
    const block = c.block ? ` ${this.block(c.block, ind)}` : "";
    const one = `${callee}(${this.joinOne(items.map((it) => ({ it, text: this.itemOneLine(it, def ?? null) })))})${block}`;
    const hasComments = items.some((it) => it.leading?.length || it.trailing || it.after?.length);
    if (!hasComments && !one.includes("\n") && ind.length + one.length <= this.width) return one;
    // Multi-line: gather bare props into .config (canonical expanded form).
    if (def) items = gatherConfig(items, def);
    const hugged = this.hug(items, ind);
    if (hugged) return `${callee}(${hugged})${block}`;
    const nested = `${ind}${this.unit}`;
    return `${callee}(\n${this.lines(items, nested, def ?? null)}\n${ind})${block}`;
  }
}

// ---------------------------------------------------------------- ordering

function modifierRank(name: string): number {
  const i = MODIFIER_ORDER.indexOf(STEP_ALIASES[name] ?? name);
  return i < 0 ? MODIFIER_ORDER.length : i;
}

/** Canonical order: identity/config modifiers first, then props, then objects (kept in written order). */
function orderItems(items: Item[], def: WidgetDef): Item[] {
  const slotNames = new Set(["obj", "objs", ...def.slots.map((s) => s.name)]);
  const mods = items.filter((i) => i.type === "Modifier" && !slotNames.has(i.name));
  const props = items.filter((i) => i.type === "Prop");
  const decls = items.filter((i) => i.type === "Decl");
  const rest = items.filter((i) => !(i.type === "Modifier" && !slotNames.has(i.name)) && i.type !== "Prop" && i.type !== "Decl");
  const sortedMods = [...mods].sort((a, b) => modifierRank((a as Modifier).name) - modifierRank((b as Modifier).name));
  return [...sortedMods, ...decls, ...sortConfig(props, def), ...rest];
}

function configKey(it: Item, def: WidgetDef): string {
  if (it.type === "Prop") return keyOf(def, it.key)?.name ?? it.key;
  if (it.type === "Modifier") return it.name;
  return "~";
}

export function sortConfig(items: Item[], def: WidgetDef): Item[] {
  return [...items].sort((a, b) => {
    const ka = configKey(a, def);
    const kb = configKey(b, def);
    const da = DIMENSIONS.indexOf(ka);
    const db = DIMENSIONS.indexOf(kb);
    if (da >= 0 || db >= 0) return (da < 0 ? 99 : da) - (db < 0 ? 99 : db);
    return ka.localeCompare(kb);
  });
}

/** Moves bare props into a `.config(...)` modifier (merging with an existing one). */
function gatherConfig(items: Item[], def: WidgetDef): Item[] {
  const props = items.filter((i): i is Prop => i.type === "Prop");
  if (!props.length) return items;
  const existing = items.find((i): i is Modifier => i.type === "Modifier" && i.name === "config");
  const others = items.filter((i) => i.type !== "Prop" && i !== existing);
  const merged: Modifier = existing
    ? { ...existing, items: [...(existing.items ?? []), ...props] }
    : { type: "Modifier", name: "config", nameSpan: props[0]?.span ?? { start: 0, end: 0 }, items: props, block: null, span: props[0]?.span ?? { start: 0, end: 0 } };
  return orderItems([merged, ...others], def);
}
