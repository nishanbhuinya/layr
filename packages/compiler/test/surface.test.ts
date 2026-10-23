import { describe, expect, it } from "vitest";
import { compileProject } from "../src/index.ts";

const page = (body: string, state = "") => `Page(.name(P) .route('/') ${state} Scaffold(.body(${body})))`;
const compile = (text: string, theme?: NonNullable<Parameters<typeof compileProject>[1]>["theme"]) => compileProject([{ path: "src/pages/index.layr", text }], theme ? { theme } : {});
const css = (r: ReturnType<typeof compile>) => r.modules.get("src/pages/index.layr")?.css ?? "";
const errors = (r: ReturnType<typeof compile>) => r.diagnostics.filter((d) => d.severity === "error");

describe("text on painted objects", () => {
  it("is light on a dark colour and dark on a light one", () => {
    const r = compile(page("Column(Container(.config(color: black) Text('a')) Container(.config(color: #fff8e0) Text('b')))"));
    expect(errors(r)).toEqual([]);
    expect(css(r)).toContain("background-color:#000000;color:var(--layr-color-onDark,#ffffff)");
    expect(css(r)).toContain("background-color:#fff8e0;color:var(--layr-color-onLight,#141414)");
  });

  it("follows a theme colour through its --layr-on- variable, defined for light and dark mode", () => {
    const theme = { colors: { panel: "#fffcf7" }, dark: { panel: "#1a1816" }, fonts: {} };
    const r = compile(page("Container(.config(color: panel) Text('a'))"), theme);
    expect(css(r)).toContain("color:var(--layr-on-panel,var(--layr-color-onLight,#141414))");
    expect(r.globalCss).toContain("--layr-on-panel:var(--layr-color-onLight,#141414)");
    expect(r.globalCss).toMatch(/data-theme=dark\] \.l-root\{[^}]*--layr-on-panel:var\(--layr-color-onDark,#ffffff\)/);
  });

  it("leaves text alone on translucent paint, and textColor wins", () => {
    const r = compile(page("Column(Container(.config(color: black.alpha(20%)) Text('a')) Container(.config(color: black, textColor: red) Text('b')))"));
    expect(css(r)).not.toMatch(/#00000033;color/);
    expect(css(r)).toContain("background-color:#000000;color:#ef4444}");
  });
});

describe("layout sizes in arithmetic", () => {
  const js = (r: ReturnType<typeof compile>) => r.modules.get("src/pages/index.layr")?.js ?? "";

  it("computes from a hugging size: the size layout works out, then changed", () => {
    const r = compile(page("Animate(Container(.id(but) .config(w: hug, h: hug, padding: 5) .on(tap: press = !press) Text('x')))", "var bool press = false Inject(.into(P.but) but.w = press ? but.w + 10 : but.w + 0  but.h = press ? but.h + 10 : but.h + 0)"));
    expect(errors(r)).toEqual([]);
    expect(js(r)).toContain('$V.arith("+", ($prev ?? "hug"), 10)');
  });

  it("starts from hug when the size was never written", () => {
    const r = compile(page("Container(.id(pill) .config(padding: 5) Text('x'))", "Inject(.into(P.pill) pill.w = pill.w + 16)"));
    expect(errors(r)).toEqual([]);
    expect(js(r)).toContain('$V.arith("+", ($prev ?? "hug"), 16)');
  });

  it("accepts hug and fill arithmetic in a config, rendered at runtime", () => {
    const r = compile(page("Row(Container(.config(w: hug + 12) Text('a')) Container(.config(w: fill - 20) Text('b')))"));
    expect(errors(r)).toEqual([]);
    expect(js(r)).toContain('"w": { "$": "calc", "op": "+", "a": "hug", "b": 12 }');
    // A Row with a child that fills (with arithmetic or without) still stacks when it runs out of room.
    expect(js(r)).toContain("ad: 1");
  });

  it("reads another object's hug size as its measured size", () => {
    const r = compile(page("Column(Container(.id(a) Text('x')) Container(.id(b) .config(w: 40)))", "Inject(.into(P.b) b.w = a.w + 10)"));
    expect(errors(r)).toEqual([]);
    expect(js(r)).toContain('$.read("P::a", "size")?.w');
  });

  it("rejects a size times a size and division by a size (L2004)", () => {
    const r = compile(page("Container(.id(b) .config(padding: 5) Text('x'))", "Inject(.into(P.b) b.w = b.w * b.h  b.h = 100 / b.h)"));
    expect(errors(r).map((d) => d.code)).toEqual(["L2004", "L2004"]);
  });
});

describe("Text line breaks", () => {
  it("shows \\n in a Text as a new line, and still collapses runs of spaces", () => {
    const r = compile(page("Text('one\\ntwo')"));
    expect(r.modules.get("src/pages/index.layr")?.js).toContain('"one\\ntwo"');
    expect(r.globalCss).toContain(".l-text{display:block;overflow-wrap:break-word;white-space:pre-line}");
  });
});

describe("Scaffold body and Position", () => {
  it("lays the body out like a Column: objects hug unless they fill", () => {
    const r = compile(page("Container(.config(color: grey) Text('x'))"));
    expect(r.globalCss).not.toContain("align-items:stretch;min-height");
    expect(css(r)).toContain("--l-body-x:flex-start");
  });

  it("pins a Position to the box around it, not the page", () => {
    const r = compile(page("Container(.config(w: 300, h: 200) Column(Text('a') Position(.config(bottom: 0, right: 0) Text('b'))))"));
    expect(errors(r)).toEqual([]);
    expect(r.globalCss).toContain(":where(:is(.l-box,.l-stack,.l-scroll,.l-grid):has(.l-pin)){position:relative}");
    expect(r.modules.get("src/pages/index.layr")?.js).toContain("l-pin");
  });
});
