import { describe, expect, it } from "vitest";
import { compileProject, format } from "../src/index.ts";

const page = (extra: string, dup: string) => `Page(
  .name(D)
  .route('/')
  ${extra}
  Scaffold(.body(Column(
    Container(.id(Card) .config(color: #e4dbcd, padding: 4) Text('Card'))
    ${dup}
  )))
)`;
const compile = (extra: string, dup: string) => compileProject([{ path: "src/pages/index.layr", text: page(extra, dup) }]);
const js = (r: ReturnType<typeof compile>) => r.modules.get("src/pages/index.layr")?.js ?? "";
const codes = (r: ReturnType<typeof compile>) => r.diagnostics.map((d) => d.code);

describe("Duplicate", () => {
  it("renders a copy that follows its original below its order, with its own config", () => {
    const r = compile("", "Duplicate(.id(CardDup) .from(Card) .exeOrder(+1) .config(Card.padding: 0, Card.text.weight: bold))");
    expect(r.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
    expect(js(r)).toContain('a: "D::CardDup", s: {');
    expect(js(r)).toContain('mi: { a: "D::Card", o: 1, v: { "padding": 0 } }');
    expect(js(r)).toContain('mi: { a: "D::Card.text(0)", o: 1, v: { "weight": "bold" } }');
  });

  it("is a target like any object: by id and by path into the copy", () => {
    const r = compile("Inject(.into(D.CardDup) .exeOrder(3) CardDup.color = #ff0000)\nInject(.into(D.CardDup.text) .exeOrder(4) text.size = 20)", "Duplicate(.id(CardDup) .from(Card))");
    expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(js(r)).toContain('a: "D::CardDup", k: "color"');
    expect(js(r)).toContain('a: "D::CardDup.text(0)", k: "size"');
  });

  it("takes its place in the original's chain (L3102), and accepts .tar", () => {
    expect(codes(compile("Inject(.into(D.Card) .exeOrder(1) Card.padding = all(2))", "Duplicate(.id(CardDup) .from(Card) .exeOrder(1))"))).toContain("L3102");
    const tar = compile("", "Duplicate(.id(CardDup) .tar(Card))");
    expect(tar.diagnostics.find((d) => d.code === "L1011")?.fixes?.[0]?.edits[0]?.text).toBe("from");
  });

  it("accepts Ditto, which layr format writes as Duplicate", () => {
    const r = compile("", "Ditto(.id(CardDup) .from(Card))");
    expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(r.diagnostics.find((d) => d.code === "L1011")?.fixes?.[0]?.edits[0]?.text).toBe("Duplicate");
    expect(js(r)).toContain('a: "D::CardDup"');
    expect(format("Ditto(.from(card))").text).toBe("Duplicate(.from(card))\n");
  });

  it("refuses a target it cannot find, and a copy of itself", () => {
    expect(codes(compile("", "Duplicate(.id(X) .from(Nope))"))).toContain("L3301");
    const self = compileProject([{ path: "src/pages/index.layr", text: "Page(.name(S) .route('/') Scaffold(.body(Column(.id(box) Duplicate(.from(box))))))" }]);
    expect(self.diagnostics.map((d) => d.code)).toContain("L3305");
  });
});
