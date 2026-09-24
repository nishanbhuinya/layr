import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { compileProject } from "../src/compile.ts";

const DOCS = join(import.meta.dirname, "../../../docs/content");

function markdown(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) markdown(p, out);
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

/** Every ```layr block in the docs compiles without errors (```layr noexec opts out for illustrative fragments). */
const snippets = markdown(DOCS).flatMap((file) => {
  const text = readFileSync(file, "utf8");
  const out: Array<[string, string]> = [];
  const re = /```layr( noexec)?\n([\s\S]*?)```/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m[1]) continue;
    const line = text.slice(0, m.index).split("\n").length;
    out.push([`${relative(DOCS, file).replace(/\\/g, "/")}:${line}`, m[2] as string]);
  }
  return out;
});

describe("docs snippets compile", () => {
  it("found snippets", () => expect(snippets.length).toBeGreaterThan(10));
  it.each(snippets)("%s", (_where, source) => {
    const r = compileProject([{ path: "src/pages/snippet.layr", text: source }], {
      theme: { colors: { brand: "#3b82f6", ink: "#0d0d0d" }, dark: {}, fonts: {} },
    });
    const errors = r.diagnostics.filter((d) => d.severity === "error").map((d) => `${d.code} ${d.message} @${source.slice(d.span.start, d.span.start + 30)}`);
    expect(errors).toEqual([]);
  });
});
