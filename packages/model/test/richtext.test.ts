import { describe, expect, it } from "vitest";
import { parseRich, type RichNode } from "../src/richtext.ts";

/** Paragraphs as compact text: [style](text), <br>. */
function show(nodes: RichNode[]): string {
  return nodes
    .map((n) => {
      if (n.t === "text") return n.s;
      if (n.t === "br") return "<br>";
      const s = Object.entries(n.style)
        .map(([k, v]) => (typeof v === "object" ? `${k}=${v.name}@${v.alpha}` : v === true ? k : `${k}=${v}`))
        .join(",");
      return `[${s}](${show(n.kids)})`;
    })
    .join("");
}
const rich = (src: string) => parseRich([src]).paras.map(show);

describe("RichText markup", () => {
  it("styles runs, marks and nested marks", () => {
    expect(rich("This text here is (blue)[Blue], (#000)[Black] *Bold &* _italic._")).toEqual(["This text here is [color=blue@1](Blue), [color=#000@1](Black) [bold](Bold &) [italic](italic.)"]);
    expect(rich("(green.50)[And this text is] (24)[_*BIG*_ and *_translucent_ green*.]")).toEqual(["[color=green@0.5](And this text is) [size=24]([italic]([bold](BIG)) and [bold]([italic](translucent) green).)"]);
  });

  it("reads a list of styles", () => {
    expect(rich("(grey.90, wight.700, italic, 35, hL.green.30)[faint]")).toEqual(["[color=grey@0.9,weight=700,italic,size=35,highlight=green@0.3](faint)"]);
    expect(rich("(link: /docs, underline)[the docs]")).toEqual(["[link=/docs,underline](the docs)"]);
  });

  it("breaks lines at \\n, paragraphs at blank lines, and joins other lines", () => {
    expect(rich("one \\n\n  two\n  three\n\n  four")).toEqual(["one <br> two three", "four"]);
  });

  it("nullifies with slashes", () => {
    expect(rich("/(blue)[Blue]")).toEqual(["(blue)[Blue]"]);
    expect(rich("//(blue)[Blue]")).toEqual(["/(blue)[Blue]"]);
    expect(rich("/*not bold*")).toEqual(["*not bold*"]);
    expect(rich("https://layr.dynshift.com")).toEqual(["https://layr.dynshift.com"]);
  });

  it("leaves prose alone: parentheses, arithmetic, snake_case", () => {
    expect(rich("LAYR (a language) is [new]")).toEqual(["LAYR (a language) is [new]"]);
    expect(rich("2 * 3 * 4 and snake_case_name")).toEqual(["2 * 3 * 4 and snake_case_name"]);
    expect(rich("`code *not bold*`")).toEqual(["[code](code *not bold*)"]);
  });

  it("keeps interpolated values as text, never markup", () => {
    expect(parseRich(["Hi ", { value: "*you*" }, " (red)[!]"]).paras.map(show)).toEqual(["Hi *you* [color=red@1](!)"]);
  });

  it("reports what looks like a style but is not one", () => {
    const r = parseRich(["(blu)[x]"], (n) => n === "blue");
    expect(r.problems[0]?.message).toContain("`blu` is not a RichText style");
    expect(r.paras.map(show)).toEqual(["(blu)[x]"]);
  });
});
