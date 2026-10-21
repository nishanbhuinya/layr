/**
 * `layr upgrade`: deprecated forms → their current spelling, with consent. It lists every use
 * (inform), asks before writing (consent), then rewrites and formats the files it changed (do).
 * `--check` only reports (exit 1 when something is deprecated); `--yes` agrees in advance.
 */
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { applyEdits, format, upgrades } from "@layr-internal/compiler";
import { findRoot, loadProject } from "../project.ts";
import { type Args, c, flag } from "../ui.ts";

async function ask(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^y(es)?$/i.test((await rl.question(question)).trim());
  } finally {
    rl.close();
  }
}

export async function upgrade(args: Args) {
  const root = findRoot(process.cwd());
  let p = loadProject(root);
  const list = upgrades(p.result.diagnostics);
  if (!list.length) {
    console.log(`${c.green("✓")} Nothing to upgrade: the project uses only current forms.`);
    return;
  }

  // Inform.
  const files = [...new Set(list.map((u) => u.file))];
  const groups = new Map<string, typeof list>();
  for (const u of list) groups.set(u.deprecation.id, [...(groups.get(u.deprecation.id) ?? []), u]);
  for (const items of groups.values()) {
    const d = (items[0] as (typeof list)[number]).deprecation;
    console.log(`${c.bold(d.title)} ${c.gray(`(since ${d.since}; the old form goes in ${d.removeIn})`)}`);
    console.log(`  ${c.red(d.before)}\n  ${c.green(d.after)}`);
    for (const u of items) {
      const text = p.files.find((f) => f.path === u.file)?.text ?? "";
      const line = text.slice(0, u.span.start).split("\n").length;
      console.log(c.gray(`  ${u.file}:${line}`));
    }
    console.log("");
  }
  const summary = `${list.length} change(s) in ${files.length} file(s)`;
  if (flag(args, "check")) {
    console.log(c.yellow(`${summary} to upgrade. Run ${c.bold("layr upgrade")} to apply them.`));
    process.exitCode = 1;
    return;
  }

  // Consent.
  const yes = !!flag(args, "yes", "y");
  if (!yes) {
    if (!process.stdin.isTTY) {
      console.log(`${summary}. Nothing was changed: run ${c.bold("layr upgrade --yes")} to apply them.`);
      return;
    }
    if (!(await ask(`Apply ${summary}? [y/N] `))) {
      console.log(c.gray("Nothing was changed."));
      return;
    }
  }

  // Do: apply, format what changed, and repeat while a rewrite reveals another deprecated form.
  let changed = 0;
  for (let round = 0, todo = list; todo.length && round < 3; round++) {
    for (const file of new Set(todo.map((u) => u.file))) {
      const f = p.files.find((x) => x.path === file);
      if (!f) continue;
      const next = applyEdits(f.text, todo.filter((u) => u.file === file).flatMap((u) => u.edits));
      const formatted = format(next);
      writeFileSync(f.abs, formatted.errors ? next : formatted.text);
      changed++;
    }
    p = loadProject(root);
    todo = upgrades(p.result.diagnostics);
  }
  const left = upgrades(p.result.diagnostics).length;
  console.log(`${c.green("✓")} Updated ${files.length} file(s).${left ? c.yellow(` ${left} use(s) still need a hand edit; layr analyze shows where.`) : ""}`);
  void changed;
}
