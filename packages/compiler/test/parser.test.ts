import { describe, expect, it } from "vitest";
import type { Call, Decl, Expr, Item, Modifier, Prop } from "../src/ast.ts";
import { parse } from "../src/parser.ts";

function ok(src: string) {
  const r = parse(src);
  expect(r.diagnostics.map((d) => `${d.code} ${d.message} @${d.span.start}`)).toEqual([]);
  return r.file;
}
const expr = (i: Item | undefined): Expr => {
  if (!i || i.type !== "ExprItem") throw new Error(`not an expr item: ${i?.type}`);
  return i.expr;
};
const call = (i: Item | undefined): Call => {
  const e = expr(i);
  if (e.type !== "Call") throw new Error(`not a call: ${e.type}`);
  return e;
};

describe("parser", () => {
  it("parses the notes' Container with .config/.obj and nested groups", () => {
    const f = ok(`
Container(
  .config(
    // dimensions first
    w: 200
    h: 200
    borderColor: #0d0d0d
    .border(
      align: in
      color: #0d0d0d
      width: 2
    )
    color: #fff
    padding: sym(x: 20, y: 10)
  )
  .obj(
    Text(
      .config(align: mid, color: #000, size: 16)
      .obj('Hello')
    )
  )
)`);
    const c = call(f.items[0]);
    expect((c.callee as { name: string }).name).toBe("Container");
    const config = c.items[0] as Modifier;
    expect(config.name).toBe("config");
    expect((config.items?.[0] as Prop).leading).toEqual(["// dimensions first"]);
    expect(config.items?.map((i) => (i.type === "Prop" ? i.key : i.type === "Modifier" ? `.${i.name}` : i.type))).toEqual([
      "w",
      "h",
      "borderColor",
      ".border",
      "color",
      "padding",
    ]);
  });

  it("parses widget params with req, defaults, optional types and immutability", () => {
    const f = ok(`
Widget(
  .name(ColorSquare)
  .param(
    req color color
    len w = 200
    num? h
    !mut align borderAlign = mid
    list<txt> tags = []
  )
  .obj(Container(.config(w: param.w, h: param.h ?? 200) .obj(.obj)))
)`);
    const params = (call(f.items[0]).items[1] as Modifier).items as Decl[];
    expect(params.map((d) => [d.name, d.typeRef?.name, d.required, d.immutable, d.typeRef?.optional])).toEqual([
      ["color", "color", true, false, false],
      ["w", "len", false, false, false],
      ["h", "num", false, false, true],
      ["borderAlign", "align", false, true, false],
      ["tags", "list", false, false, false],
    ]);
  });

  it("parses declarations, string interpolation and !mut props", () => {
    const f = ok(`
var int index = 0
const txt title = 'index is'
bind txt label = '$title \${index + 1}'
!mut var int seed = 42
export var int count
Container(.config(!mut color: #0d0d0d, padding: all(20)))`);
    const decls = f.items.slice(0, 5) as Decl[];
    expect(decls.map((d) => [d.kind, d.name, d.immutable, d.exported])).toEqual([
      ["var", "index", false, false],
      ["const", "title", false, false],
      ["bind", "label", false, false],
      ["var", "seed", true, false],
      ["var", "count", false, true],
    ]);
    const label = decls[2]?.init;
    expect(label?.type).toBe("String");
    if (label?.type === "String") {
      expect(label.parts.map((p) => (typeof p === "string" ? p : p.type))).toEqual(["Ident", " ", "Binary"]);
    }
    const cfg = call(f.items[5]).items[0] as Modifier;
    expect((cfg.items?.[0] as Prop).immutable).toBe(true);
  });

  it("parses SAPI control flow and TS blocks", () => {
    const f = ok(`
Function(
  .name(calc)
  .param(ref int n)
  .def(
    .if(.cnd(n == null) .exe(n = 0))
    .fb(.exe(n++))
  )
)
Function(.name(calc2) .param(ref int n) .def { n = n == null ? 0 : n + 1 })
Button(.fnc(.loop(.exe(animBox.w = 200) .wait(100ms) .exe(animBox.h = 300))))`);
    const def = call(f.items[0]).items[2] as Modifier;
    expect(def.items?.map((i) => (i as Modifier).name)).toEqual(["if", "fb"]);
    const p = (call(f.items[0]).items[1] as Modifier).items?.[0] as Decl;
    expect(p.ref).toBe(true);
    const def2 = call(f.items[1]).items[2] as Modifier;
    expect(def2.block?.code.trim()).toBe("n = n == null ? 0 : n + 1");
    const loop = ((call(f.items[2]).items[0] as Modifier).items?.[0] as Modifier).items as Modifier[];
    expect(loop.map((m) => m.name)).toEqual(["exe", "wait", "exe"]);
  });

  it("parses Export / Extract / Inject with lookup paths and sibling indices", () => {
    const f = ok(`
Extract(
  .from(SomePage.card)
  .exeOrder(-1)
  insets basePad = card.padding
  txt t = DemoPage.scaffold.body.mid.column.text(1)
)
Inject(.into(SomePage.card) .exeOrder(0) card.padding = basePad * 2)
Inject(.into(SomePage.card) .exeOrder(1) card.padding++)`);
    const ex = call(f.items[0]);
    expect((ex.items[2] as Decl).kind).toBe("binding");
    const t = (ex.items[3] as Decl).init;
    expect(t?.type).toBe("Call");
    const inj = call(f.items[1]);
    expect(expr(inj.items[2]).type).toBe("Assign");
    expect(expr(call(f.items[2]).items[2]).type).toBe("Update");
  });

  it("parses shorthand calls, units, colours, tuples and member chains", () => {
    const f = ok(`Container(color: red, Column(Text('1'), Text('2')), size: (200, 120), fade: 100ms, tint: #fff.alpha(50%))`);
    const c = call(f.items[0]);
    expect(c.items.map((i) => i.type)).toEqual(["Prop", "ExprItem", "Prop", "Prop", "Prop"]);
    const size = (c.items[2] as Prop).value;
    expect(size.type).toBe("Tuple");
    const tint = (c.items[4] as Prop).value;
    expect(tint.type).toBe("Call");
  });

  it("parses imports and .react blocks", () => {
    const f = ok(`import { useQuery } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import Glass, { GlassCard as Card } from '@author/layr-glass'
Page(.name(Stats) .react { const q = useQuery({ queryKey: ['s'] }) })`);
    const [a, b, c] = f.items;
    expect(a).toMatchObject({ type: "Import", source: "@tanstack/react-query", named: [{ name: "useQuery", alias: "useQuery" }] });
    expect(b).toMatchObject({ type: "Import", namespace: "Dialog" });
    expect(c).toMatchObject({ type: "Import", defaultName: "Glass", named: [{ name: "GlassCard", alias: "Card" }] });
    const react = call(f.items[3]).items[1] as Modifier;
    expect(react.block?.code).toContain("useQuery({ queryKey: ['s'] })");
  });

  it("recovers from errors and keeps going", () => {
    const r = parse(`Container(
  .config(w: 200 h: )
)
Text('after')`);
    expect(r.diagnostics.length).toBeGreaterThan(0);
    expect(r.file.items.length).toBe(2);
  });

  it("keeps trailing and after comments", () => {
    const f = ok(`Column(
  Text('a') // first
  Text('b')
  // tail
)`);
    const c = call(f.items[0]);
    expect(c.items[0]?.trailing).toBe("// first");
    expect(c.items[1]?.after).toEqual(["// tail"]);
  });
});

describe("side-effect imports", () => {
  it("parses import 'pkg'", () => {
    const f = ok(`import '@dynshift/layr-icons'\nText('x')`);
    expect(f.items[0]).toMatchObject({ type: "Import", source: "@dynshift/layr-icons", named: [], defaultName: null });
  });
});
