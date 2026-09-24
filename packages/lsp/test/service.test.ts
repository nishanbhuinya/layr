import { describe, expect, it } from "vitest";
import { LayrService } from "../src/service.ts";

const PAGE = `Page(
  .name(Home)
  var int count = 0
  Scaffold(
    .body(Column(
      Container(
        .id(card)
        .config(
          w: 200
          objAlign: mid
          |
        )
      )
    ))
  )
)
Inject(.into(Home.card) .exeOrder(0) card.padding = all(4))
`;

function setup(src = PAGE) {
  const offset = src.indexOf("|");
  const text = src.replace("|", "");
  const s = new LayrService();
  s.setFile("src/pages/home.layr", text);
  return { s, offset, text };
}

describe("LayrService", () => {
  it("completes config keys inside .config()", () => {
    const { s, offset } = setup();
    const labels = s.complete("src/pages/home.layr", offset).map((c) => c.label);
    expect(labels).toContain("padding");
    expect(labels).toContain("cornerRadius");
    expect(labels).toContain("border");
  });

  it("completes enum values after key:", () => {
    const { s, offset } = setup(PAGE.replace("|", "overflow: |"));
    const labels = s.complete("src/pages/home.layr", offset).map((c) => c.label);
    expect(labels).toEqual(["auto", "wrap", "stack", "scroll", "clip", "shrink", "warn", "error"]);
  });

  it("completes modifiers after a dot", () => {
    const { s, offset } = setup(PAGE.replace("        .config(\n          w: 200\n          objAlign: mid\n          |\n        )", "        .|"));
    const labels = s.complete("src/pages/home.layr", offset).map((c) => c.label);
    expect(labels).toContain("config");
    expect(labels).toContain("id");
    expect(labels).toContain("obj");
  });

  it("completes frames in .at(", () => {
    const { s, offset } = setup(PAGE.replace("|", ".at(|"));
    expect(s.complete("src/pages/home.layr", offset).map((c) => c.label)).toEqual(["m", "t", "w", "uw"]);
  });

  it("hovers widgets and keys", () => {
    const { s, text } = setup();
    const h1 = s.hover("src/pages/home.layr", text.indexOf("Container") + 2);
    expect(h1?.markdown).toContain("**Container**");
    const h2 = s.hover("src/pages/home.layr", text.indexOf("objAlign") + 2);
    expect(h2?.markdown).toContain("Container.objAlign");
  });

  it("goes to id definitions and finds injectors", () => {
    const { s, text } = setup();
    const use = text.lastIndexOf("card.padding") + 1;
    const def = s.definition("src/pages/home.layr", use);
    expect(def && text.slice(def.span.start, def.span.end)).toBe("card");
    const refs = s.references("src/pages/home.layr", text.indexOf(".id(card)") + 5);
    expect(refs.map((r) => `${r.kind}:${r.key}:${r.order}`)).toContain("inject:padding:0");
  });

  it("lists symbols", () => {
    const { s } = setup();
    expect(s.symbols("src/pages/home.layr").map((x) => [x.name, x.kind, x.children?.map((c) => c.name)])).toEqual([["Home", "page", ["count"]]]);
  });
});
