/**
 * Refactors on the object under the cursor, the ones a Flutter developer reaches for: wrap it in
 * another object, remove it (keeping its child), move it among its siblings, extract it into a
 * Widget. Each returns the whole new text, formatted when it parses.
 */
import { type Call, type Expr, format, type Item, parse } from "@layr-internal/compiler";

export interface Refactor {
  title: string;
  kind: "refactor.rewrite" | "refactor.extract";
  text: string;
}

/** What the wrap actions put around the object (`$` is the object). */
export const WRAPS: ReadonlyArray<[string, string]> = [
  ["Container", "Container($)"],
  ["Padding", "Container(.config(padding: all(8)) $)"],
  ["Column", "Column($)"],
  ["Row", "Row($)"],
  ["Stack", "Stack($)"],
  ["Scroll", "Scroll($)"],
  ["Mid", "Mid($)"],
  ["Expand", "Expand($)"],
  ["Animate", "Animate($)"],
  ["Position", "Position(.config(top: 0, left: 0) $)"],
  ["If", "If(.cnd(true) $)"],
  ["Repeat", "Repeat(.times(2) $)"],
];

/** Definitions and operations: not objects in a tree. */
const NOT_OBJECTS = new Set(["App", "Page", "Widget", "Function", "Preset", "Theme", "DesignScale", "Extract", "Inject", "Export", "Var", "LinearGradient", "RadialGradient", "ConicGradient", "AngularGradient"]);

interface Found {
  call: Call;
  /** The item list it sits in (a call's items or a modifier's), and its item there. */
  siblings: Item[];
  item: Item;
  /** The enclosing Page or Widget definition. */
  owner: Call | null;
}

function name(c: Call): string {
  return c.callee.type === "Ident" ? c.callee.name : c.callee.type === "Member" ? c.callee.name : "";
}

function isObject(c: Call): boolean {
  const n = name(c);
  return !c.jsx && /^[A-Z]/.test(n) && !NOT_OBJECTS.has(n);
}

/** Every object call with its siblings, outermost first. */
function objects(items: Item[], owner: Call | null, out: Found[] = []): Found[] {
  for (const it of items) {
    if (it.type === "Modifier" && it.items) objects(it.items, owner, out);
    if (it.type !== "ExprItem" || it.expr.type !== "Call") continue;
    const c = it.expr;
    const n = name(c);
    if (isObject(c)) out.push({ call: c, siblings: items, item: it, owner });
    objects(c.items, n === "Page" || n === "Widget" ? c : owner, out);
  }
  return out;
}

/** Objects among an item list (positional or in a slot modifier is not mixed: siblings are one list). */
function objectSiblings(f: Found): Found[] {
  return f.siblings.flatMap((it) => (it.type === "ExprItem" && it.expr.type === "Call" && isObject(it.expr) ? [{ ...f, call: it.expr, item: it }] : []));
}

/** The one object a call holds (positional, or in `.obj(...)`), or null. */
function onlyChild(c: Call): Call | null {
  const kids: Call[] = [];
  for (const it of c.items) {
    if (it.type === "ExprItem" && it.expr.type === "Call" && isObject(it.expr)) kids.push(it.expr);
    if (it.type === "Modifier" && (it.name === "obj" || it.name === "objs" || it.name === "body" || it.name === "wgt"))
      for (const sub of it.items ?? []) if (sub.type === "ExprItem" && sub.expr.type === "Call" && isObject(sub.expr)) kids.push(sub.expr);
  }
  return kids.length === 1 ? (kids[0] as Call) : null;
}

/** Applies span edits (any order), then formats when the result parses. */
function edit(text: string, edits: Array<{ start: number; end: number; text: string }>): string {
  let out = text;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  const f = format(out);
  return f.errors ? out : f.text;
}

/** Walks every AST node under `n` (objects with a `type`). */
function visit(n: unknown, fn: (x: { type: string; span?: { start: number; end: number } } & Record<string, unknown>) => void) {
  if (!n || typeof n !== "object") return;
  if (Array.isArray(n)) {
    for (const x of n) visit(x, fn);
    return;
  }
  const o = n as Record<string, unknown>;
  if (typeof o.type === "string") fn(o as never);
  for (const [k, v] of Object.entries(o)) if (k !== "span" && k !== "leading" && k !== "after" && v && typeof v === "object") visit(v, fn);
}

export function refactors(text: string, start: number, end = start): Refactor[] {
  const { file } = parse(text);
  const all = objects(file.items, null);
  // The innermost object around the cursor (or the selection).
  const here = all.filter((f) => f.call.span.start <= start && end <= f.call.span.end).sort((a, b) => a.call.span.end - a.call.span.start - (b.call.span.end - b.call.span.start))[0];
  if (!here) return [];
  const { call } = here;
  const src = text.slice(call.span.start, call.span.end);
  const out: Refactor[] = [];

  for (const [label, pattern] of WRAPS) out.push({ title: `Wrap with ${label}`, kind: "refactor.rewrite", text: edit(text, [{ start: call.span.start, end: call.span.end, text: pattern.replace("$", src) }]) });

  const child = onlyChild(call);
  if (child) out.push({ title: `Remove ${name(call)} (keep its ${name(child)})`, kind: "refactor.rewrite", text: edit(text, [{ start: call.span.start, end: call.span.end, text: text.slice(child.span.start, child.span.end) }]) });

  const sibs = objectSiblings(here);
  const i = sibs.findIndex((s) => s.call === call);
  const swap = (other: Call) => edit(text, [
    { start: call.span.start, end: call.span.end, text: text.slice(other.span.start, other.span.end) },
    { start: other.span.start, end: other.span.end, text: src },
  ]);
  if (i > 0) out.push({ title: "Move up", kind: "refactor.rewrite", text: swap((sibs[i - 1] as Found).call) });
  if (i >= 0 && i < sibs.length - 1) out.push({ title: "Move down", kind: "refactor.rewrite", text: swap((sibs[i + 1] as Found).call) });

  const extracted = extractWidget(text, here);
  if (extracted) out.push(extracted);
  return out;
}

/**
 * Extract to Widget: the object becomes `Widget(.name(NewWidget) .param(...) .wgt(...))` at the end
 * of the file, and an instance takes its place. State it reads becomes params passed by the caller;
 * an object that writes its page's state stays where it is (a widget cannot write it).
 */
function extractWidget(text: string, here: Found): Refactor | null {
  const { call, owner } = here;
  // Names the object may read from where it is: its Page's or Widget's state, and a Widget's params.
  const state = new Map<string, string>();
  const params = new Set<string>();
  const typeOf = (d: Item & { type: "Decl" }) => (d.typeRef ? text.slice(d.typeRef.span.start, d.typeRef.span.end) : "any");
  for (const it of owner?.items ?? []) if (it.type === "Decl" && (it.kind === "var" || it.kind === "const" || it.kind === "bind")) state.set(it.name, typeOf(it));
  for (const m of owner?.items ?? [])
    if (m.type === "Modifier" && m.name === "param")
      for (const d of m.items ?? [])
        if (d.type === "Decl") {
          state.set(d.name, typeOf(d));
          params.add(d.name);
        }
  const used = new Map<string, Array<{ start: number; end: number }>>();
  let writes = false;
  visit(call, (n) => {
    if ((n.type === "Assign" || n.type === "Update") && ((n.target ?? n.argument) as Expr | undefined)?.type === "Ident" && state.has(((n.target ?? n.argument) as { name: string }).name)) writes = true;
    if (n.type === "Ident" && state.has(n.name as string) && n.span) used.set(n.name as string, [...(used.get(n.name as string) ?? []), n.span]);
    // `param.x` in a widget being extracted from a widget: the param is passed on too.
    if (n.type === "Member" && (n.object as Expr | undefined)?.type === "Ident" && (n.object as { name: string }).name === "param" && n.span && state.has(n.name as string))
      used.set(n.name as string, [...(used.get(n.name as string) ?? []), n.span]);
  });
  if (writes) return null;
  let wname = "NewWidget";
  for (let k = 2; text.includes(`.name(${wname})`); k++) wname = `NewWidget${k}`;
  const base = call.span.start;
  const edits = [...used.values()].flat().map((s) => ({ start: s.start - base, end: s.end - base, name: text.slice(s.start, s.end).replace(/^param\./, "") }));
  let body = text.slice(call.span.start, call.span.end);
  for (const e of edits.sort((a, b) => b.start - a.start)) body = body.slice(0, e.start) + (text[base + e.start - 1] === "$" ? `{param.${e.name}}` : `param.${e.name}`) + body.slice(e.end);
  const names = [...used.keys()];
  const def = `Widget(.name(${wname})${names.length ? ` .param(${names.map((p) => `${state.get(p)} ${p}`).join(", ")})` : ""} .wgt(${body}))`;
  const inst = `${wname}(${names.length ? `.config(${names.map((p) => `${p}: ${params.has(p) ? `param.${p}` : p}`).join(", ")})` : ""})`;
  return { title: `Extract ${name(call)} to a Widget`, kind: "refactor.extract", text: edit(`${text.replace(/\s*$/, "")}\n\n${def}\n`, [{ start: call.span.start, end: call.span.end, text: inst }]) };
}
