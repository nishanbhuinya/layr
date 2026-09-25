import { describe, expect, it } from "vitest";
import { compileProject } from "../src/index.ts";

const js = (expr: string) =>
  compileProject([{ path: "src/pages/index.layr", text: `import { lib, fn } from './lib.ts'\nPage(.name(P) .route('/') Scaffold(.body(Text(.config(font: ${expr}) .obj('x')))))` }]).modules.get("src/pages/index.layr")?.js ?? "";

describe("calls into JavaScript", () => {
  it("passes named arguments of a method call as a trailing options object", () => {
    expect(js("lib.font('Inter', weights: [400, 700], italic: true)")).toContain(`lib.font("Inter", { "weights": [400, 700], "italic": true })`);
  });
  it("does the same for an imported function", () => {
    expect(js("fn('Inter', weights: [400])")).toContain(`fn("Inter", { "weights": [400] })`);
  });
  it("keeps plain positional calls as written", () => {
    expect(js("fn('Inter')")).toContain(`fn("Inter")`);
  });
});

describe("widgets from other files", () => {
  it("must be imported, and the error says how", () => {
    const r = compileProject([
      { path: "src/widgets/card.layr", text: "Widget(.name(Card) .obj(Text('x')))" },
      { path: "src/pages/index.layr", text: "Page(.name(P) .route('/') Scaffold(.body(Card())))" },
    ]);
    const d = r.diagnostics.find((x) => x.code === "L1005");
    expect(d?.message).toContain("import { Card } from '../widgets/card.layr'");
  });
  it("compile once imported", () => {
    const r = compileProject([
      { path: "src/widgets/card.layr", text: "Widget(.name(Card) .obj(Text('x')))" },
      { path: "src/pages/index.layr", text: "import { Card } from '../widgets/card.layr'\nPage(.name(P) .route('/') Scaffold(.body(Card())))" },
    ]);
    expect(r.diagnostics.filter((x) => x.severity === "error")).toEqual([]);
  });
});

describe("links to pages", () => {
  it("name the page, from the same file or another", () => {
    const r = compileProject([{ path: "src/pages/index.layr", text: "Page(.name(Nav) Scaffold(.body(Link(.config(label: 'Home', to: Home)))))\nPage(.name(Home) .route('/') Scaffold(.body(Text('Home'))))" }]);
    expect(r.modules.get("src/pages/index.layr")?.js).toContain('"to": "Home"');
  });
});

describe("JavaScript globals", () => {
  it("are usable in expressions", () => {
    const r = compileProject([{ path: "src/pages/index.layr", text: "Page(\n  .name(P)\n  .route('/')\n  var num x = 2.6\n  Scaffold(.body(Text('${Math.round(x)} ${JSON.stringify([x])}')))\n)" }]);
    expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(r.modules.get("src/pages/index.layr")?.js).toContain("Math.round(");
  });
});
