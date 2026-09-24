import { describe, expect, it } from "vitest";
import { compileProject } from "../src/index.ts";

describe("row adaptation sees through widgets", () => {
  it("treats a user widget whose root fills as a fill child", () => {
    const text = `Widget(.name(Pane) .obj(Column(.config(w: fill) .obj)))
Page(.name(P) .route('/') Scaffold(.body(Row(Pane(Text('a')), Pane(Text('b'))))))`;
    const js = compileProject([{ path: "src/pages/index.layr", text }]).modules.get("src/pages/index.layr")?.js ?? "";
    expect(js).toContain("ad: 1");
  });
});
