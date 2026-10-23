/**
 * `layr upgrade`: moves a project to a newer LAYR, then its code.
 *
 * 1. LAYR itself: the latest `@dynshift/layr` (or `--to 3.3`), installed with the project's package
 *    manager once you agree, the `layr:` range in layr.yaml and an installed Skill kept in step.
 * 2. The code: the newly installed version lists its deprecated forms and rewrites them once you
 *    agree (inform → consent → do). `--code` runs only this step, with the installed version.
 *
 * `--check` only reports (exit 1 when anything is behind); `--yes` agrees in advance.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import semver from "semver";
import { parseDocument } from "yaml";
import { applyEdits, format, upgrades } from "@layr-internal/compiler";
import { resolveProjectLayr } from "@layr-internal/node/install";
import { findRoot, loadProject } from "../project.ts";
import { type Args, c, CliError, flag } from "../ui.ts";
import { type NpmPackument, packageManager, packument, run } from "./addons.ts";

const PKG = "@dynshift/layr";

async function ask(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^y(es)?$/i.test((await rl.question(question)).trim());
  } finally {
    rl.close();
  }
}

/** Whether to go ahead: `--yes`, or a yes at the prompt. Without a terminal, nothing changes. */
async function consent(args: Args, question: string, howTo: string): Promise<boolean> {
  if (flag(args, "yes", "y")) return true;
  if (!process.stdin.isTTY) {
    console.log(`Nothing was changed: run ${c.bold(howTo)} to apply it.`);
    return false;
  }
  if (await ask(`${question} [y/N] `)) return true;
  console.log(c.gray("Nothing was changed."));
  return false;
}

/** The version `spec` names: a dist-tag (`latest`, `next`), an exact version or a range (`3.2`). */
export function pickVersion(p: Pick<NpmPackument, "dist-tags" | "versions">, spec: string): string | null {
  if (p["dist-tags"][spec]) return p["dist-tags"][spec] as string;
  if (p.versions[spec]) return spec;
  return semver.maxSatisfying(Object.keys(p.versions), spec);
}

/** The dependency spec to write: the same style the project uses (`^3.3.0`, `~3.3.0` or exact). */
export function dependencySpec(current: string | undefined, version: string): string {
  const prefix = current?.match(/^\s*([\^~]?)\d/)?.[1] ?? "^";
  return `${prefix}${version}`;
}

/** The package manager's arguments to install `@dynshift/layr@spec` in the field it is in. */
export function installArgs(pm: string, spec: string, dev: boolean): string[] {
  const pkg = `${PKG}@${spec}`;
  if (pm === "npm") return ["install", pkg, ...(dev ? ["--save-dev"] : [])];
  if (pm === "yarn") return ["add", pkg, ...(dev ? ["--dev"] : [])];
  if (pm === "bun") return ["add", pkg, ...(dev ? ["--dev"] : [])];
  return ["add", pkg, ...(dev ? ["--save-dev"] : [])];
}

/** How a LAYR version upgrades code: 3.3+ `upgrade --code`, 3.2 `upgrade`, older versions had no step. */
export function codeStep(version: string): string[] | null {
  const v = semver.coerce(version)?.version ?? version;
  if (semver.gte(v, "3.3.0")) return ["upgrade", "--code"];
  if (semver.gte(v, "3.2.0")) return ["upgrade"];
  return null;
}

/** Runs a command of the project's installed LAYR. */
function runInstalled(root: string, argv: string[]): number {
  const local = resolveProjectLayr(root);
  if (!local) throw new CliError(`${PKG} is not installed in this project: run your package manager's install first.`);
  const r = spawnSync(process.execPath, [local.bin, ...argv], { cwd: root, stdio: "inherit", env: { ...process.env, LAYR_DEFERRED: local.version } });
  return r.status ?? 1;
}

export async function upgrade(args: Args) {
  if (flag(args, "code")) return upgradeCode(args);
  const root = findRoot(process.cwd());
  const pkgFile = join(root, "package.json");
  const pkg = existsSync(pkgFile) ? (JSON.parse(readFileSync(pkgFile, "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }) : {};
  const dev = !pkg.dependencies?.[PKG] && !!pkg.devDependencies?.[PKG];
  const written = pkg.dependencies?.[PKG] ?? pkg.devDependencies?.[PKG];
  const installed = resolveProjectLayr(root);
  if (!written && !installed) throw new CliError(`This project does not depend on ${PKG}. Add it with ${c.bold(`npm install ${PKG}`)}.`);
  const current = installed?.version ?? semver.minVersion(written as string)?.version ?? "0.0.0";

  const to = (flag(args, "to") as string | undefined) ?? "latest";
  const p = await packument(PKG);
  if (!p) throw new CliError("Could not reach the npm registry to find the latest LAYR. Check the connection, or upgrade the code alone with `layr upgrade --code`.");
  const target = pickVersion(p, String(to));
  if (!target) throw new CliError(`No ${PKG} version matches \`${to}\`. Latest is ${p["dist-tags"].latest}.`);

  const check = !!flag(args, "check");
  const step = codeStep(current);
  if (semver.eq(target, current)) {
    console.log(`${c.green("✓")} LAYR ${current} is the ${to === "latest" ? "latest" : "requested"} version.`);
    if (step) {
      const status = runInstalled(root, [...step, ...(check ? ["--check"] : []), ...(flag(args, "yes", "y") ? ["--yes"] : [])]);
      if (check && status) process.exitCode = status;
    }
    return;
  }

  // Inform.
  const older = semver.lt(target, current);
  console.log(`${c.bold("LAYR")} ${current} → ${c.bold(target)}${older ? c.yellow(" (an older version)") : ""}`);
  if (semver.major(target) > semver.major(current)) console.log(c.yellow(`  A new major version: some code may need changes. Read what changed first.`));
  console.log(c.gray(`  What changed: https://layr.dynshift.com/changelog`));
  const pm = packageManager(root);
  const spec = dependencySpec(written, target);
  console.log(c.gray(`  ${pm.name} ${installArgs(pm.name, spec, dev).join(" ")}`));
  if (existsSync(join(root, "layr.yaml"))) console.log(c.gray(`  layr.yaml: layr: ^${target}`));
  if (existsSync(join(root, ".claude", "skills", "layr", ".layr-version"))) console.log(c.gray(`  the LAYR Skill in .claude/skills/layr`));
  console.log(c.gray(`  then ${target}'s code upgrade lists deprecated forms and asks before rewriting them`));
  if (check) {
    console.log(c.yellow(`\nLAYR ${target} is available. Run ${c.bold("layr upgrade")} to upgrade.`));
    process.exitCode = 1;
    return;
  }

  // Consent.
  if (!(await consent(args, `\nUpgrade to LAYR ${target}?`, "layr upgrade --yes"))) return;

  // Do: the package, layr.yaml, the Skill, then the code with the new version.
  run(pm.name, installArgs(pm.name, spec, dev), root);
  const now = resolveProjectLayr(root);
  if (now?.version !== target) throw new CliError(`${pm.name} finished, but the project now has ${PKG} ${now?.version ?? "missing"}, not ${target}.`);
  const yamlFile = join(root, "layr.yaml");
  if (existsSync(yamlFile)) {
    const doc = parseDocument(readFileSync(yamlFile, "utf8"));
    doc.set("layr", `^${target}`);
    writeFileSync(yamlFile, doc.toString());
  }
  if (existsSync(join(root, ".claude", "skills", "layr", ".layr-version"))) runInstalled(root, ["skills", "update"]);
  console.log(`${c.green("✓")} LAYR ${target}`);
  const next = codeStep(target);
  if (next) runInstalled(root, [...next, ...(flag(args, "yes", "y") ? ["--yes"] : [])]);
  console.log(c.gray("Restart layr dev if it is running. The VS Code extension switches to the new version by itself."));
}

/** Deprecated forms → their current spelling, with consent: inform, ask, then rewrite and format. */
export async function upgradeCode(args: Args) {
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
    console.log(c.yellow(`${summary} to upgrade. Run ${c.bold("layr upgrade --code")} to apply them.`));
    process.exitCode = 1;
    return;
  }

  // Consent.
  if (!(await consent(args, `Apply ${summary}?`, "layr upgrade --code --yes"))) return;

  // Do: apply, format what changed, and repeat while a rewrite reveals another deprecated form.
  for (let round = 0, todo = list; todo.length && round < 3; round++) {
    for (const file of new Set(todo.map((u) => u.file))) {
      const f = p.files.find((x) => x.path === file);
      if (!f) continue;
      const next = applyEdits(f.text, todo.filter((u) => u.file === file).flatMap((u) => u.edits));
      const formatted = format(next);
      writeFileSync(f.abs, formatted.errors ? next : formatted.text);
    }
    p = loadProject(root);
    todo = upgrades(p.result.diagnostics);
  }
  const left = upgrades(p.result.diagnostics).length;
  console.log(`${c.green("✓")} Updated ${files.length} file(s).${left ? c.yellow(` ${left} use(s) still need a hand edit; layr analyze shows where.`) : ""}`);
}
