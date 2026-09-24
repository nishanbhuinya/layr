/**
 * Rewrites every ```layr block in docs/content into canonical form (`layr format`) at the width a
 * docs code pane shows without scrolling. Blocks the formatter cannot parse are left as written.
 * Run: node tools/format-docs.ts   (CI checks the docs stay canonical)
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "../packages/compiler/src/index.ts";

export const DOCS_WIDTH = 80;

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "content");

function files(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files(p, out);
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

export function formatMarkdown(md: string): { text: string; changed: number } {
  let changed = 0;
  const text = md.replace(/```layr([^\n]*)\n([\s\S]*?)\n```/g, (whole, info: string, code: string) => {
    const r = format(code, { width: DOCS_WIDTH });
    const text = r.text.replace(/\n+$/, "");
    if (r.errors || text === code) return whole;
    changed++;
    return `\`\`\`layr${info}\n${text}\n\`\`\``;
  });
  return { text, changed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes("--check");
  let total = 0;
  for (const f of files(root)) {
    const src = readFileSync(f, "utf8").replace(/\r\n/g, "\n");
    const { text, changed } = formatMarkdown(src);
    if (!changed) continue;
    total += changed;
    if (check) console.log(`not canonical: ${f}`);
    else writeFileSync(f, text);
  }
  console.log(`${check ? "found" : "formatted"} ${total} block(s)`);
  if (check && total) process.exit(1);
}
