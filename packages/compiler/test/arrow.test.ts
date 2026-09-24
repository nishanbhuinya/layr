import { describe, expect, it } from "vitest";
import { compileProject, format } from "../src/index.ts";

describe("arrow functions", () => {
  const page = `Page(
  .name(Todo)
  .route('/')
  const list<any> items = [1, 2, 3]
  Scaffold(.body(Column(
    Each(.of(items.filter((n) => n > 1)) .as(n) .obj(Text('$n')))
    Text('\${items.map(n => n * 2).join(", ")}')
  )))
)`;
  it("compile to JavaScript arrows with their own scope", () => {
    const r = compileProject([{ path: "src/pages/index.layr", text: page }]);
    expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    const js = r.modules.get("src/pages/index.layr")?.js ?? "";
    expect(js).toContain("((n) => (n > 1))");
    expect(js).toMatch(/items\.map\(\(\(n\) => /);
  });
  it("format canonically as (a) => body", () => {
    expect(format("Text(.obj(items.map(n => n + 1)))").text.trim()).toBe("Text(.obj(items.map((n) => n + 1)))");
  });
});
