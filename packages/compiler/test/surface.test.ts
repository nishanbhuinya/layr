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

describe("layout sizes in arithmetic (L2004)", () => {
  it("rejects hug and default sizes, accepts lengths and measured sizes", () => {
    const bad = compile(page("Container(.id(b) .config(w: hug, padding: 5) Text('x'))", "var bool on = false Inject(.into(P.b) b.w = on ? b.w + 10 : b.w  b.h = b.h + 4)"));
    expect(errors(bad).map((d) => d.code)).toEqual(["L2004", "L2004"]);
    const good = compile(page("Container(.id(b) .config(w: 120, padding: 5) Text('x'))", "var bool on = false Inject(.into(P.b) b.w = on ? b.w + 10 : b.w)"));
    expect(errors(good)).toEqual([]);
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
