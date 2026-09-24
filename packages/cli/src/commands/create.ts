/** `layr create <name>` / `layr create addon <name>`. */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Args, c, CliError, flag } from "../ui.ts";
import { layrVersion } from "../version.ts";

/** Templates ship inside the package; in the monorepo they live at the repository root. */
export function templatesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(here, "..", "templates"), join(here, "..", "..", "templates"), join(here, "..", "..", "..", "templates"), join(here, "..", "..", "..", "..", "templates")];
  for (const c0 of candidates) if (existsSync(join(c0, "app"))) return c0;
  throw new CliError("LAYR templates are missing from this installation.");
}

function pascalCase(s: string): string {
  return s
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function fill(dir: string, vars: Record<string, string>) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      fill(p, vars);
      continue;
    }
    const text = readFileSync(p, "utf8");
    const out = text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m);
    if (out !== text) writeFileSync(p, out);
    if (name === "_gitignore") renameSync(p, join(dir, ".gitignore"));
  }
}

export async function create(args: Args) {
  let [kind, name] = args._ as [string | undefined, string | undefined];
  if (kind !== "addon" && kind !== "proj" && kind !== "project" && kind !== "app") {
    name = kind;
    kind = "app";
  }
  if (!name) throw new CliError(`Usage: ${c.bold("layr create <name>")} or ${c.bold("layr create addon <name>")}`);
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) throw new CliError("Names use letters, digits, `-` and `_`.");
  const target = resolve(process.cwd(), (flag(args, "dir") as string | undefined) ?? name);
  if (existsSync(target) && readdirSync(target).length) throw new CliError(`${relative(process.cwd(), target)} already exists and is not empty.`);
  const template = kind === "addon" ? "addon" : ((flag(args, "template") as string | undefined) ?? "app");
  const src = join(templatesDir(), template);
  if (!existsSync(src)) throw new CliError(`Unknown template \`${template}\`. Templates: app, blank, addon.`);
  mkdirSync(target, { recursive: true });
  cpSync(src, target, { recursive: true });
  const id = name.toLowerCase().replace(/-/g, "_");
  fill(target, { name, Name: pascalCase(name), id, layrVersion: layrVersion() });
  const rel = relative(process.cwd(), target) || ".";
  console.log(`${c.green("✓")} Created ${kind === "addon" ? "addon" : "project"} ${c.bold(name)} in ${rel}\n`);
  console.log(`  cd ${rel}\n  npm install\n  npx layr dev\n`);
  if (kind !== "addon") console.log(c.dim("Give your AI agent the LAYR Skill: npx layr skills install"));
}
