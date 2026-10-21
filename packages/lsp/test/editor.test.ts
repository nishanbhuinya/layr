import { describe, expect, it } from "vitest";
import { refactors } from "../src/refactor.ts";
import { LayrService } from "../src/service.ts";

const at = (src: string) => ({ text: src.replace("|", ""), offset: src.indexOf("|") });

describe("completion writes whole calls", () => {
  it("closes the bracket and puts the cursor inside, in quotes for text", () => {
    const { text, offset } = at("Page(.name(H) .route('/') Scaffold(.body(Cont|)))");
    const s = new LayrService();
    s.setFile("src/pages/h.layr", text);
    const items = s.complete("src/pages/h.layr", offset);
    expect(items.find((c) => c.label === "Container")).toMatchObject({ insert: "Container($0)", snippet: true });
    expect(items.find((c) => c.label === "Text")?.insert).toBe("Text('$0')");
    expect(items.find((c) => c.label === "Widget")?.insert).toContain(".wgt($0)");
  });

  it("writes only the name when a bracket already follows", () => {
    const { text, offset } = at("Page(.name(H) .route('/') Scaffold(.body(Cont|())))");
    const s = new LayrService();
    s.setFile("src/pages/h.layr", text);
    expect(s.complete("src/pages/h.layr", offset).find((c) => c.label === "Container")).toMatchObject({ insert: "Container" });
  });

  it("answers from the last compile while the text changes", () => {
    const s = new LayrService();
    s.setFile("src/pages/h.layr", "Page(.name(H) .route('/') Scaffold(.body(Text('a'))))");
    s.compile();
    s.setFile("src/pages/h.layr", "Page(.name(H) .route('/') Scaffold(.body(Text('a') C)))");
    const t = performance.now();
    s.complete("src/pages/h.layr", 51);
    expect(performance.now() - t).toBeLessThan(20);
  });
});

describe("refactors", () => {
  const page = (body: string) => `Page(\n  .name(H)\n  .route('/')\n  var int n = 0\n  Scaffold(.body(Column(${body})))\n)\n`;
  const pick = (src: string, title: string) => {
    const { text, offset } = at(src);
    return refactors(text, offset).find((r) => r.title.startsWith(title))?.text ?? "";
  };

  it("wraps the object under the cursor", () => {
    const out = pick(page("Te|xt('a'), Text('b')"), "Wrap with Padding");
    expect(out).toContain("Container(\n");
    expect(out).toContain("padding: all(8)");
    expect(out.indexOf("Text('a')")).toBeGreaterThan(out.indexOf("Container("));
    expect(pick(page("Te|xt('a')"), "Wrap with Row")).toContain("Row(Text('a'))");
  });

  it("removes a wrapper and keeps its child, and moves among siblings", () => {
    expect(pick(page("Mi|d(Text('a'))"), "Remove Mid")).toContain("Column(Text('a'))");
    const moved = pick(page("Text('a'), Te|xt('b')"), "Move up");
    expect(moved.indexOf("Text('b')")).toBeLessThan(moved.indexOf("Text('a')"));
    expect(refactors(...(Object.values(at(page("Te|xt('a'), Text('b')"))) as [string, number])).map((r) => r.title)).not.toContain("Move up");
  });

  it("extracts an object into a Widget, passing the state it reads", () => {
    const out = pick(page("Contain|er(.config(padding: all(4)) Text('n is $n'))"), "Extract Container");
    expect(out).toContain("Widget(\n  .name(NewWidget)");
    expect(out).toContain("int n");
    expect(out).toContain("Text('n is ${param.n}')");
    expect(out).toMatch(/NewWidget\(\.config\(n: n\)\)/);
    // An object that writes its page's state stays: a widget cannot write it.
    expect(refactors(...(Object.values(at(page("Butt|on(.fnc(n = n + 1) Text('+'))"))) as [string, number])).map((r) => r.title)).not.toContain("Extract Button to a Widget");
  });
});
