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
    expect(format(src).text).toBe("Column(.id(list) .config(w: 200, h: 100, gap: 8, padding: all(4), xAlign: mid) .objs(Text('a')))\n");
  });

  it("expands long nodes and gathers props into .config", () => {
    const src = `Container(color: #FFF, w: 200, cornerRadius: 16, padding: all(24), shadow: shadow(y: 4, blur: 12), Text('A long enough text to force expansion'))`;
    expect(format(src).text).toBe(`Container(
  .config(w: 200, color: #fff, cornerRadius: 16, padding: all(24), shadow: shadow(y: 4, blur: 12))
  Text('A long enough text to force expansion')
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
  it("keeps the comma between a value and a group modifier on one line", () => {
    const r = format("Container(.config(size: 120, .border(width: 2)))");
    expect(r.text.trim()).toBe("Container(.config(size: 120, .border(width: 2)))");
  });
  it("reports a missing comma instead of emitting a method call on a number", () => {
    const c = compileProject([{ path: "src/pages/index.layr", text: "Page(.name(P) .route('/') Scaffold(.body(Container(.config(size: 120 .border(width: 2))))))" }]);
    expect(c.diagnostics.map((d) => d.code)).toContain("L0012");
  });
});
