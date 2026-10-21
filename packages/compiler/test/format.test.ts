import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compileProject } from "../src/compile.ts";
import { format } from "../src/format.ts";

const EXAMPLES = join(import.meta.dirname, "../../../examples");

function layrFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.name === "node_modules" || name.name === "dist") continue;
    const p = join(dir, name.name);
    if (name.isDirectory()) layrFiles(p, out);
    else if (name.name.endsWith(".layr")) out.push(p);
  }
  return out;
}

describe("format", () => {
  it("canonicalises aliases and ordering", () => {
    const src = `Col(.objs(Text('a')), .config(xAlign: mid, gap: 8, h: 100, w: 200, pad: all(4)), .id(list))`;
    expect(format(src).text).toBe(`Column(
  .id(list)
  .config(
    w: 200
    h: 100
    gap: 8
    padding: all(4)
    xAlign: mid
  )
  .objs(Text('a'))
)
`);
  });

  it("puts every entry, modifier and object on its own line, however short, and gathers props into .config", () => {
    const src = `Container(color: #FFF, w: 200, cornerRadius: 16, Text('A'))`;
    expect(format(src).text).toBe(`Container(
  .config(
    w: 200
    color: #fff
    cornerRadius: 16
  )
  Text('A')
)
`);
  });

  it("keeps a single short item inline: names, one config entry, a text, a forwarded object", () => {
    expect(format("Widget(.name(Card) .wgt(Container(.config(color: red) .obj(param.obj))))").text).toBe(`Widget(
  .name(Card)
  .wgt(
    Container(
      .config(color: red)
      .obj(param.obj)
    )
  )
)
`);
    expect(format("Mid(Text('Hi'))").text).toBe("Mid(Text('Hi'))\n");
    // Value calls are expressions: they never break by structure.
    expect(format("Container(.config(padding: sym(x: 32, y: 8)))").text).toBe("Container(.config(padding: sym(x: 32, y: 8)))\n");
  });

  it("formats the Report 5 ColorSquare like Flutter: groups after keys, expressions inline", () => {
    const src = "Widget(.name(ColorSquare) .param(req color color, req object obj, double x = 200, double y, double bW) .wgt(Container(.config(.border(align: in, color: param.color.invert, width: param.bW!), size: (param.x, param.y ?? 200), color: param.color) .obj(param.obj))))";
    expect(format(src).text).toBe(`Widget(
  .name(ColorSquare)
  .param(
    req color color
    req obj obj
    num x = 200
    num y
    num bW
  )
  .wgt(
    Container(
      .config(
        size: (param.x, param.y ?? 200)
        color: param.color
        .border(
          align: in
          color: param.color.invert
          width: param.bW!
        )
      )
      .obj(param.obj)
    )
  )
)
`);
  });

  it("keeps comments", () => {
    const src = `// a page
Page(
  .name(P) // named
  // the root
  Scaffold(.body(Text('x')))
  // end
)
`;
    const out = format(src).text;
    expect(out).toContain("// a page");
    expect(out).toContain(".name(P) // named");
    expect(out).toContain("  // the root");
    expect(out).toContain("  // end");
  });

  it("rewrites SAPI and colour aliases", () => {
    const src = `Function(.namme(f) .def(.if(.cnd(a) .exc(b = 1)) .fb(.exc(b = 2))))
Container(.config(color: #fff.opacity(.5)))`;
    const out = format(src).text;
    expect(out).toContain(".name(f)");
    expect(out).not.toContain(".exc(");
    expect(out).toContain("#fff.alpha(.5)");
  });

  it("canonicalises alignment spellings", () => {
    expect(format("Container(.config(objAlign: tM))").text).toBe("Container(.config(objAlign: topMid))\n");
  });

  it("leaves files with syntax errors untouched", () => {
    const src = "Container(.config(w: ))";
    const r = format(src);
    expect(r.text).toBe(src);
    expect(r.errors).toBeGreaterThan(0);
  });

  const files = layrFiles(EXAMPLES);
  it.each(files.map((f) => [f.slice(EXAMPLES.length + 1).replace(/\\/g, "/"), f]))("%s is idempotent and meaning-preserving", (rel, path) => {
    const src = readFileSync(path as string, "utf8");
    const once = format(src).text;
    const twice = format(once).text;
    expect(twice).toBe(once);
    const project = (rel as string).split("/")[0] as string;
    const siblings = files.filter((f) => f.slice(EXAMPLES.length + 1).replace(/\\/g, "/").startsWith(`${project}/`));
    const toInput = (override: string | null) =>
      siblings.map((f) => ({ path: f.slice(EXAMPLES.length + 1).replace(/\\/g, "/").replace(`${project}/`, ""), text: f === path && override !== null ? override : readFileSync(f, "utf8") }));
    const a = compileProject(toInput(null));
    const b = compileProject(toInput(once));
    const key = (rel as string).replace(`${project}/`, "");
    expect(b.modules.get(key)?.js.replace(/:\d+"/g, '"')).toBe(a.modules.get(key)?.js.replace(/:\d+"/g, '"'));
    expect(b.modules.get(key)?.css).toBe(a.modules.get(key)?.css);
  });
});

describe("commas before modifiers", () => {
  it("puts a value and a group modifier on lines of their own", () => {
    const r = format("Container(.config(size: 120, .border(width: 2)))");
    expect(r.text.trim()).toBe("Container(\n  .config(\n    size: 120\n    .border(width: 2)\n  )\n)");
  });
  it("reads a spaced `.name(` after a value as the next modifier, not a method call on the value", () => {
    const c = compileProject([{ path: "src/pages/index.layr", text: "Page(.name(P) .route('/') Scaffold(.body(Container(.config(size: 120 .border(width: 2))))))" }]);
    expect(c.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(c.modules.get("src/pages/index.layr")?.css).toMatch(/border:calc\(2 \* var\(--ds\) \/ 1000\) solid/);
  });
});

describe("commas are optional", () => {
  const errors = (body: string) =>
    compileProject([{ path: "src/pages/index.layr", text: `Page(.name(P) .route('/') Scaffold(.body(${body})))` }]).diagnostics.filter((d) => d.severity === "error").map((d) => d.code);
  it("between objects, config entries and !mut entries on one line", () => {
    expect(errors("Column(Text('a') Text('b'))")).toEqual([]);
    expect(errors("Row(.config(gap: 8 padding: all(4)) Text('a') Text('b'))")).toEqual([]);
    expect(errors("Column(Container(.config(w: 100 h: 40 !mut color: red)))")).toEqual([]);
  });
  it("still refuse a stray operator between items (L0012)", () => {
    expect(errors("Row(Text('a') ] Text('b'))")).toContain("L0012");
  });
  it("members written against the value stay members", () => {
    expect(errors("Column(Container(.config(size: 40, color: red.alpha(50%))))")).toEqual([]);
  });
  it("the formatter still writes the canonical comma on one line", () => {
    expect(format("Animate(.enter(slide(y: 20) fade) Text('a'))").text.trim()).toBe("Animate(\n  .enter(slide(y: 20), fade)\n  Text('a')\n)");
  });
});
