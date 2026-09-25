import { describe, expect, it } from "vitest";
import { compileProject, format, parse } from "../src/index.ts";

const compile = (text: string) => {
  const r = compileProject([{ path: "src/pages/index.layr", text }]);
  return { js: r.modules.get("src/pages/index.layr")?.js ?? "", errors: r.diagnostics.filter((d) => d.severity === "error") };
};

describe("JSX in LAYR", () => {
  it("wraps LAYR objects in a DOM element", () => {
    const r = compile(`Page(
  .name(P)
  .route('/')
  Scaffold(.body(
    <div className="hero" data-x="1">
      Container(
        .config(padding: all(16))
        .obj(Text('Inside'))
      )
    </div>
  ))
)`);
    expect(r.errors).toEqual([]);
    expect(r.js).toContain(`$j("div", { "className": "hero", "data-x": "1", children:`);
    expect(r.js).toContain(`"Inside"`);
  });

  it("puts React elements in a LAYR slot, with text, attributes and expressions", () => {
    const r = compile(`Page(
  .name(P)
  .route('/')
  var int n = 3
  Scaffold(.body(Container(
    .config(padding: all(8))
    .obj(<p class="note">Don't panic: {n} left &amp; counting</p>)
  )))
)`);
    expect(r.errors).toEqual([]);
    expect(r.js).toContain(`$js("p", { "className": "note", children: ["Don't panic: ",`);
    expect(r.js).toContain(`" left & counting"`);
  });

  it("uses imported React components as tags, with spreads and self-closing elements", () => {
    const r = compile(`import { Chart } from 'recharts'
Page(
  .name(P)
  .route('/')
  Scaffold(.body(Column(
    <Chart height={240} {...{ data: [] }} />
    <>
      <hr />
      Text('After the rule')
    </>
  )))
)`);
    expect(r.errors).toEqual([]);
    expect(r.js).toContain(`$j(Chart, { "height": (240), ...(`);
    expect(r.js).toContain(`$js($Fr, {`);
  });

  it("gives LAYR objects inside JSX lookup paths through the element", () => {
    const { file } = parse(`Page(.name(P) .route('/') Scaffold(.body(<section>Text('a')</section>)))`);
    expect(file.items.length).toBe(1);
    const r = compileProject([{ path: "src/pages/index.layr", text: `Page(.name(P) .route('/') Scaffold(.body(<section>Text('a')</section>)))\nInject(.into(P.scaffold.body.section.text) text.color = red)` }]);
    expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  });

  it("keeps less-than comparisons as comparisons", () => {
    const r = compile(`Page(
  .name(P)
  .route('/')
  var int a = 1
  Scaffold(.body(Text(a <b ? 'less' : 'more')))
)`);
    expect(r.errors.map((e) => e.message)).not.toContain("JSX");
  });

  it("reports an unknown component tag and a mismatched closing tag", () => {
    expect(compile(`Page(.name(P) .route('/') Scaffold(.body(<Nope />)))`).errors.map((e) => e.code)).toContain("L1005");
    expect(compile(`Page(.name(P) .route('/') Scaffold(.body(<div>x</span>)))`).errors.map((e) => e.code)).toContain("L0006");
  });

  it("formats around JSX without changing it", () => {
    const src = `Page(.name(P) .route('/') Scaffold(.body(<div   className="a">  Text('x')  </div>)))\n`;
    const r = format(src);
    expect(r.errors).toBe(0);
    expect(r.text).toContain(`<div   className="a">  Text('x')  </div>`);
  });
});
