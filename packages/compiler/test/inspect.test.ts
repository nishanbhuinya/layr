import { describe, expect, it } from "vitest";
import { compileProject } from "../src/index.ts";

describe("inspect", () => {
  it("emits developer lookup paths when inspect is on", () => {
    const page = `Page(.name(Demo) .route('/') Scaffold(.body(Mid(Column(Text('a'), Text('b'), Row(.id(card) Text('c')))))))`;
    const r = compileProject([{ path: "src/pages/index.layr", text: page }], { inspect: true });
    const js = r.modules.get("src/pages/index.layr")?.js ?? "";
    expect(js).toContain('p: "Demo.scaffold.body.mid.column.text(0)"');
    expect(js).toContain('p: "Demo.scaffold.body.mid.column.text(1)"');
    expect(js).toContain('p: "Demo.card"');
    expect(js).toContain('p: "Demo.card.text"');
    const off = compileProject([{ path: "src/pages/index.layr", text: page }]).modules.get("src/pages/index.layr")?.js ?? "";
    expect(off).not.toContain('p: "Demo');
  });
});
