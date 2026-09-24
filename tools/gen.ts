/**
 * Generates everything derived from the schema, the diagnostics catalogue and the docs:
 *   skills/layr/reference/*.md       the LAYR Skill's references
 *   packages/layr/styles.css         base + Design Scale CSS
 * Run: node --experimental-strip-types tools/gen.ts   (CI checks the output is committed and current)
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { globalCss } from "../packages/compiler/src/index.ts";
import { CONSTRUCTS, DIAGNOSTICS, WIDGETS } from "../packages/model/src/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ref = join(root, "skills", "layr", "reference");

export function widgetsMarkdown(): string {
  const out: string[] = ["# Widgets", "", "Generated from the LAYR schema. Every key accepts the listed aliases; `layr format` rewrites them to the canonical name.", ""];
  const modules = [...new Set(WIDGETS.map((w) => w.module))];
  for (const m of modules) {
    out.push(`## ${m.charAt(0).toUpperCase()}${m.slice(1)}`, "");
    for (const w of WIDGETS.filter((x) => x.module === m)) {
      out.push(`### ${w.name}${w.aliases?.length ? ` (aliases: ${w.aliases.join(", ")})` : ""}`, "", w.doc, "");
      out.push("```layr", w.example, "```", "");
      if (w.slots.length) out.push(`Slots: ${w.slots.map((s) => `\`.${s.name}\` (${s.kind}${s.default ? ", default" : ""}${s.required ? ", required" : ""})`).join(", ")}.`, "");
      if (w.primaryAction) out.push(`\`.fnc\` runs on \`${w.primaryAction}\`.`, "");
      if (w.events?.length) out.push(`Events: ${w.events.map((e) => `\`${e}\``).join(", ")}.`, "");
      out.push("| Key | Type | Default | Aliases | Meaning |", "|---|---|---|---|---|");
      for (const k of w.keys) {
        const type = k.type === "enum" ? (k.values ?? []).join(" \\| ") : `${k.type}${k.values?.length ? ` \\| ${k.values.join(" \\| ")}` : ""}`;
        out.push(`| \`${k.name}\` | ${type} | ${k.default ?? ""} | ${(k.aliases ?? []).join(", ")} | ${k.doc.replace(/\|/g, "\\|")} |`);
      }
      for (const g of w.groups ?? []) out.push("", `Group \`.${g.name}(${Object.keys(g.keys).join(", ")})\`: ${g.doc}`);
      out.push("");
    }
  }
  out.push("## Constructs", "");
  for (const c of CONSTRUCTS) out.push(`### ${c.name}`, "", c.doc, "", `Modifiers: ${c.modifiers.map((m) => `\`.${m}\``).join(", ")}.`, "", "```layr", c.example, "```", "");
  out.push("### If", "", "Shows `.obj(...)` when `.cnd(test)` is true, otherwise `.fb(...)`.", "", "### Each", "", "Repeats `.obj(...)` for every item of `.of(list)`; `.as(item, index)` names them; `.key(expr)` sets a stable key.", "");
  return out.join("\n");
}

export function diagnosticsMarkdown(): string {
  const out: string[] = ["# Diagnostics", "", "Generated from the LAYR diagnostics catalogue. `layr explain <code>` prints any entry.", ""];
  for (const d of DIAGNOSTICS) {
    out.push(`## ${d.code}: ${d.title} (${d.severity})`, "", d.explain, "");
    if (d.example) out.push("Wrong:", "", "```layr", d.example.bad, "```", "", "Right:", "", "```layr", d.example.good, "```", "");
  }
  return out.join("\n");
}

function docsFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) docsFiles(p, out);
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function main() {
  rmSync(ref, { recursive: true, force: true });
  mkdirSync(ref, { recursive: true });
  writeFileSync(join(ref, "widgets.md"), widgetsMarkdown());
  writeFileSync(join(ref, "diagnostics.md"), diagnosticsMarkdown());
  for (const f of docsFiles(join(root, "docs", "content"))) {
    let name = basename(f);
    if (f.includes(`${join("language", "widgets.md")}`)) name = "widgets-guide.md";
    if (name === "introduction.md" || name === "quick-start.md" || name === "troubleshooting.md" || name === "migrating-from-v1.md" || name === "ai.md") continue;
    copyFileSync(f, join(ref, name));
  }
  writeFileSync(join(root, "packages", "layr", "styles.css"), `/* @dynshift/layr base styles and Design Scale (default frames). Generated; do not edit. */\n${globalCss()}\n`);
  console.log(`generated ${readdirSync(ref).length} reference files`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
void readFileSync;
