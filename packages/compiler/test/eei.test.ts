import { describe, expect, it } from "vitest";
import { compileProject } from "../src/index.ts";

const page = `Page(.name(Store) .route('/') Scaffold(.body(Container(.id(card) .config(padding: all(16)) .obj(Text('x'))))))`;
const codes = (text: string) => compileProject([{ path: "src/pages/index.layr", text: `${page}\n${text}` }]).diagnostics.map((d) => d.code);

describe("Export/Extract/Inject", () => {
  it("refuses an Inject that reads an unordered Extract of the feature it writes", () => {
    expect(codes("Extract(.from(Store.card) insets base = card.padding)\nInject(.into(Store.card) .exeOrder(0) card.padding = base * 2)")).toContain("L3203");
  });
  it("accepts the same Inject when the Extract reads below it", () => {
    expect(codes("Extract(.from(Store.card) .exeOrder(-1) insets base = card.padding)\nInject(.into(Store.card) .exeOrder(0) card.padding = base * 2)")).not.toContain("L3203");
  });
  it("accepts an unordered Extract of a feature no Inject writes", () => {
    expect(codes("Extract(.from(Store.card) insets base = card.padding)\nInject(.into(Store.card) .exeOrder(0) card.color = #ff0000)")).not.toContain("L3203");
  });
});

describe("lookup paths into widget instances", () => {
  const files = (inject: string) => [
    { path: "src/widgets/tag.layr", text: "Widget(.name(Tag) .param(txt label = '') .obj(Row(Text(.obj(param.label)), Text(.obj('!')))))" },
    { path: "src/pages/index.layr", text: `import { Tag } from '../widgets/tag.layr'\nPage(.name(P) .route('/') Scaffold(.body(Column(Tag(.config(label: 'a')), Tag(.config(label: 'b'))))))\n${inject}` },
  ];
  it("address one instance's inner object, naming the widget's root or not", () => {
    for (const path of ["P.scaffold.body.column.tag(1).row.text(0)", "P.scaffold.body.column.tag(1).text(0)"]) {
      const r = compileProject(files(`Inject(.into(${path}) .exeOrder(0) text.color = #ff0000)`));
      expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
      const js = r.modules.get("src/pages/index.layr")?.js ?? "";
      expect(js).toMatch(/a: "P::[^"]*>[^"]*text/);
      // The addressed instance passes its address into the widget, and the widget's inner text uses it.
      expect(js).toContain("$a:");
      expect(r.modules.get("src/widgets/tag.layr")?.js).toContain("ip: $p.$a");
    }
  });
});
