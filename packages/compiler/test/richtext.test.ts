import { describe, expect, it } from "vitest";
import { compileProject } from "../src/index.ts";

const compile = (body: string, state = "") => compileProject([{ path: "src/pages/index.layr", text: `Page(.name(P) .route('/') ${state} Scaffold(.body(${body})))` }]);
const js = (r: ReturnType<typeof compile>) => r.modules.get("src/pages/index.layr")?.js ?? "";

describe("RichText", () => {
  it("passes its markup as written, values apart, to the renderer", () => {
    const r = compile("RichText('Hi $name, (red)[*now*]\\n')", "var txt name = 'x'");
    expect(r.diagnostics.filter((d) => d.severity !== "info")).toEqual([]);
    expect(js(r)).toContain('$.richText(["Hi ", { value: name.get() }, ", (red)[*now*]\\\\n"])');
  });

  it("takes prose over several lines in quotes, in place or in .obj", () => {
    const r = compile("RichText(.config(size: 18) .obj('one\n  two'))");
    expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(compile("Text('one\n two')").diagnostics.map((d) => d.code)).toContain("L0002");
  });

  it("warns about a style it does not know, at its place", () => {
    const r = compile("RichText('A (blu)[word]')");
    const d = r.diagnostics.find((x) => x.code === "L1018");
    expect(d?.severity).toBe("warning");
    expect(d?.message).toContain("`blu`");
  });

  it("knows theme colours", () => {
    const r = compileProject([{ path: "src/pages/index.layr", text: "Page(.name(P) .route('/') Scaffold(.body(RichText('(accent)[hot]'))))" }], { theme: { colors: { accent: "#c93f12" }, dark: {}, fonts: {} } });
    expect(r.diagnostics.map((d) => d.code)).not.toContain("L1018");
  });
});
