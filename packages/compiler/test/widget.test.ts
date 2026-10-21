import { describe, expect, it } from "vitest";
import { compileProject, format } from "../src/index.ts";

const compile = (text: string) => compileProject([{ path: "src/pages/index.layr", text }]);
const js = (r: ReturnType<typeof compile>) => r.modules.get("src/pages/index.layr")?.js ?? "";
const page = (body: string) => `Page(.name(P) .route('/') Scaffold(.body(${body})))`;

// Report 5's ColorSquare, with `//` comments (LAYR's) and `param.bW` as declared.
const COLOR_SQUARE = `Widget(
  .name(ColorSquare)
  .param(
    req color color
    req object obj
    double x = 200
    double y
    double bW
    align bA = in | mid | out // multiple options
  )
  .wgt( // this is renamed from .obj()
    Container(
      .config(
        size: (param.x, param.y ?? 200)
        color: param.color
        .border(
          align: param.bA!
          color: param.color.invert // invert extension
          width: param.bW!
        )
      )
      .obj(param.obj)
    )
  )
)
`;

describe("Widget .wgt", () => {
  it("compiles the Report 5 ColorSquare: .wgt, a param named obj, listed values", () => {
    const r = compile(`${COLOR_SQUARE}\n${page("ColorSquare(.config(color: red, bW: 4, bA: out) .obj(Text('Hi')))")}`);
    expect(r.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
    expect(js(r)).toContain('"bA": "in"');
    expect(js(r)).toContain("children: $p.children");
  });

  it("names a misspelt param", () => {
    const r = compile(COLOR_SQUARE.replace("width: param.bW!", "width: param.bw!"));
    expect(r.diagnostics.find((d) => d.code === "L1005")?.message).toContain("Did you mean `bW`?");
  });

  it("refuses a value outside a param's list, and a list a key cannot take", () => {
    const outside = compile(`${COLOR_SQUARE}\n${page("ColorSquare(.config(color: red, bA: left) .obj(Text('Hi')))")}`);
    expect(outside.diagnostics.map((d) => d.code)).toContain("L1004");
    const wrong = compile(COLOR_SQUARE.replace("in | mid | out", "in | mid | sideways"));
    expect(wrong.diagnostics.find((d) => d.code === "L1004")?.message).toContain("`sideways`");
  });

  it("still compiles .obj and .body as the rendered object, reported as deprecated with a fix", () => {
    const r = compile("Widget(.name(Card) .obj(Container(.config(padding: all(8)) .obj(.obj))))");
    const d = r.diagnostics.find((x) => x.code === "L1017");
    expect(d?.severity).toBe("warning");
    expect(d?.deprecation).toBe("widget-wgt");
    expect(d?.fixes?.[0]?.edits[0]?.text).toBe("wgt");
    expect(r.diagnostics.filter((x) => x.severity === "error")).toEqual([]);
    expect(compile("Widget(.name(Card) .body(Container()))").diagnostics.map((x) => x.code)).toContain("L1017");
    expect(compile("Widget(.name(Card) .wgt(Container()))").diagnostics.map((x) => x.code)).not.toContain("L1017");
  });

  it("formats listed values and leaves a deprecated form for layr upgrade", () => {
    const out = format("Widget(.name(C) .param(align a = in | mid) .obj(Container()))").text;
    expect(out).toContain("align a = in | mid");
    expect(out).toContain(".obj(Container())");
  });

  it("explains a # comment", () => {
    expect(compile("// ok\n# not a comment").diagnostics[0]?.message).toContain("comments start with `//`");
  });
});
