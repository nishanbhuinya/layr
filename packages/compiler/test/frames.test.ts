import { describe, expect, it } from "vitest";
import { compileProject } from "../src/index.ts";

describe("per-frame values", () => {
  it("keep the plain value when .at sets the smallest frame", () => {
    const text = "Page(.name(P) .route('/') Scaffold(.body(Text(.config(size: 72) .at(m, size: 34) .obj('Hi')))))";
    const r = compileProject([{ path: "src/pages/index.layr", text }]);
    const css = r.modules.get("src/pages/index.layr")?.css ?? "";
    // 34 at m flows to 72 at t: both anchors appear in the compiled font sizes.
    expect(css).toMatch(/72|4\.5rem/);
    expect(css).toMatch(/34|2\.125rem/);
  });
});
