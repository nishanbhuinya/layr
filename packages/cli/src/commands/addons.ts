/**
 * Addons: npm is the distribution layer; LAYR resolves ids through a static index
 * (`https://layr.dynshift.com/addons.json`) with npm naming conventions as fallback.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import semver from "semver";
import { parseDocument } from "yaml";
import { discoverAddons } from "@layr-internal/node";
import { findRoot, loadProject, printDiagnostics } from "../project.ts";
import { type Args, c, CliError, flag } from "../ui.ts";
import { layrVersion } from "../version.ts";

export const INDEX_URL = process.env.LAYR_INDEX_URL ?? "https://layr.dynshift.com/addons.json";
const REGISTRY = process.env.npm_config_registry?.replace(/\/$/, "") ?? "https://registry.npmjs.org";

export interface IndexEntry {
  id: string;
  npm: string;
  name?: string;
  description?: string;
  layr?: string;
  categories?: string[];
  official?: boolean;
  repository?: string;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function loadIndex(): Promise<IndexEntry[]> {
  const idx = await fetchJson<{ addons: IndexEntry[] }>(INDEX_URL);
  return idx?.addons ?? [];
}

interface NpmPackument {
  name: string;
  "dist-tags": Record<string, string>;
  versions: Record<string, { version: string; layr?: { id: string; layr?: string }; scripts?: Record<string, string> }>;
  description?: string;
}

async function packument(name: string): Promise<NpmPackument | null> {
  return fetchJson<NpmPackument>(`${REGISTRY}/${name.replace("/", "%2f")}`);
}

/** id → npm package name. */
export async function resolveAddon(spec: string): Promise<{ npm: string; range: string | null; entry: IndexEntry | null }> {
  const at = spec.lastIndexOf("@");
  const [id, range] = at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, null];
  if (id.includes("/") || id.startsWith("layr-")) return { npm: id, range, entry: null };
  const index = await loadIndex();
  const hit = index.find((e) => e.id === id || e.npm === id);
  if (hit) return { npm: hit.npm, range, entry: hit };
  for (const candidate of [`@dynshift/layr-${id.replace(/_/g, "-")}`, `layr-${id.replace(/_/g, "-")}`, `layr-${id}`]) {
    const p = await packument(candidate);
    if (p) return { npm: candidate, range, entry: null };
  }
  throw new CliError(`Could not find an addon called \`${id}\` (looked in ${INDEX_URL} and npm). Use the npm name directly: ${c.bold("layr add @author/layr-name")}.`);
}

function packageManager(root: string): { name: string; add: string[]; remove: string[]; update: string[] } {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return { name: "pnpm", add: ["add"], remove: ["remove"], update: ["update"] };
  if (existsSync(join(root, "yarn.lock"))) return { name: "yarn", add: ["add"], remove: ["remove"], update: ["upgrade"] };
  if (existsSync(join(root, "bun.lockb")) || existsSync(join(root, "bun.lock"))) return { name: "bun", add: ["add"], remove: ["remove"], update: ["update"] };
  return { name: "npm", add: ["install"], remove: ["uninstall"], update: ["update"] };
}

function run(cmd: string, args: string[], cwd: string) {
  console.log(c.gray(`$ ${cmd} ${args.join(" ")}`));
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) throw new CliError(`${cmd} ${args[0]} failed.`);
}

function updateYaml(root: string, fn: (addons: Record<string, string>) => void) {
  const path = join(root, "layr.yaml");
  const doc = parseDocument(existsSync(path) ? readFileSync(path, "utf8") : "");
  const addons = ((doc.get("addons") as { toJSON?: () => Record<string, string> } | undefined)?.toJSON?.() ?? {}) as Record<string, string>;
  fn(addons);
  if (Object.keys(addons).length) doc.set("addons", addons);
  else doc.delete("addons");
  writeFileSync(path, doc.toString());
}

function checkCompat(name: string, range: string | undefined) {
  if (!range) return;
  const v = layrVersion();
  if (!semver.satisfies(semver.coerce(v)?.version ?? v, range, { includePrerelease: true })) console.log(c.yellow(`! ${name} declares LAYR ${range}; this project uses ${v}.`));
}

export async function add(args: Args) {
  const root = findRoot(process.cwd());
  const specs = args._;
  if (!specs.length) throw new CliError(`Usage: ${c.bold("layr add <addon>[@range]")}`);
  const pm = packageManager(root);
  const resolved: Array<{ npm: string; range: string | null; entry: IndexEntry | null; id: string; spec: string }> = [];
  for (const spec of specs) {
    const r = await resolveAddon(spec);
    const p = await packument(r.npm);
    const version = r.range ?? p?.["dist-tags"].latest;
    const meta = version ? p?.versions[version] : undefined;
    if (meta && meta.layr === undefined) console.log(c.yellow(`! ${r.npm} has no \`layr\` manifest; installing it as a plain package.`));
    if (meta?.layr) checkCompat(r.npm, meta.layr.layr);
    if (meta?.scripts && ["preinstall", "install", "postinstall"].some((s) => meta.scripts?.[s])) console.log(c.yellow(`! ${r.npm} runs install scripts; LAYR addons normally do not.`));
    resolved.push({ ...r, id: meta?.layr?.id ?? r.entry?.id ?? (spec.split("@")[0] as string), spec: `${r.npm}${r.range ? `@${r.range}` : ""}` });
  }
  run(pm.name, [...pm.add, ...resolved.map((r) => r.spec)], root);
  const installed = discoverAddons(root);
  updateYaml(root, (addons) => {
    for (const r of resolved) addons[r.id as string] = r.range ?? `^${installed.get(r.npm)?.version ?? "0.0.0"}`;
  });
  for (const r of resolved) {
    const a = installed.get(r.npm);
    console.log(`${c.green("✓")} ${c.bold(r.id as string)} ${c.gray(r.npm)}${a ? ` ${a.version}` : ""}`);
    console.log(c.dim(`  import X from '${r.npm}'`));
  }
}

export async function remove(args: Args) {
  const root = findRoot(process.cwd());
  const installed = discoverAddons(root);
  const names = args._.map((id) => [...installed.values()].find((a) => a.manifest.id === id || a.name === id)?.name ?? id);
  if (!names.length) throw new CliError(`Usage: ${c.bold("layr remove <addon>")}`);
  const pm = packageManager(root);
  run(pm.name, [...pm.remove, ...names], root);
  updateYaml(root, (addons) => {
    for (const id of args._) delete addons[id];
    for (const n of names) for (const [k, a] of installed) if (k === n) delete addons[a.manifest.id];
  });
  console.log(`${c.green("✓")} removed ${names.join(", ")}`);
}

export async function update(args: Args) {
  const root = findRoot(process.cwd());
  const installed = [...discoverAddons(root).values()];
  const targets = args._.length ? installed.filter((a) => args._.includes(a.manifest.id) || args._.includes(a.name)) : installed;
  if (!targets.length) return console.log(c.dim("No addons to update."));
  const pm = packageManager(root);
  run(pm.name, [...pm.update, ...targets.map((a) => a.name)], root);
}

export async function outdated() {
  const root = findRoot(process.cwd());
  const installed = [...discoverAddons(root).values()];
  if (!installed.length) return console.log(c.dim("No addons installed."));
  for (const a of installed) {
    const p = await packument(a.name);
    const latest = p?.["dist-tags"].latest ?? "?";
    const mark = latest !== a.version ? c.yellow("↑") : c.green("✓");
    console.log(`${mark} ${a.manifest.id.padEnd(20)} ${a.version.padEnd(10)} ${c.gray(`latest ${latest}`)}`);
  }
}

export async function search(args: Args) {
  const q = args._.join(" ").toLowerCase();
  const index = await loadIndex();
  const hits = index.filter((e) => !q || [e.id, e.name, e.description, ...(e.categories ?? [])].some((s) => s?.toLowerCase().includes(q)));
  for (const e of hits) console.log(`${c.bold(e.id.padEnd(20))} ${e.official ? c.cyan("official ") : ""}${c.gray(e.npm)}  ${e.description ?? ""}`);
  const npm = await fetchJson<{ objects: Array<{ package: { name: string; description?: string; version: string } }> }>(`${REGISTRY}/-/v1/search?text=keywords:layr-addon ${encodeURIComponent(q)}&size=20`);
  const extra = (npm?.objects ?? []).filter((o) => !hits.some((h) => h.npm === o.package.name));
  for (const o of extra) console.log(`${c.bold(o.package.name.padEnd(20))} ${c.gray(`npm ${o.package.version}`)}  ${o.package.description ?? ""}`);
  if (!hits.length && !extra.length) console.log(c.dim("No addons found."));
}

export async function info(args: Args) {
  const id = args._[0];
  if (!id) throw new CliError(`Usage: ${c.bold("layr info <addon>")}`);
  const r = await resolveAddon(id);
  const p = await packument(r.npm);
  if (!p) throw new CliError(`${r.npm} is not on npm.`);
  const latest = p["dist-tags"].latest ?? "";
  const m = p.versions[latest];
  console.log(`${c.bold(m?.layr?.id ?? id)} ${c.gray(r.npm)} ${latest}\n${p.description ?? ""}`);
  if (m?.layr?.layr) console.log(`LAYR ${m.layr.layr}`);
  if (r.entry?.repository) console.log(r.entry.repository);
  console.log(c.dim(`layr add ${m?.layr?.id ?? id}`));
}

// ---------------------------------------------------------------- authoring

function readPkg(root: string) {
  const path = join(root, "package.json");
  if (!existsSync(path)) throw new CliError("No package.json here.");
  return JSON.parse(readFileSync(path, "utf8")) as {
    name: string;
    version: string;
    files?: string[];
    scripts?: Record<string, string>;
    layr?: { id: string; entry: string; layr?: string; kind?: string };
    peerDependencies?: Record<string, string>;
  };
}

/** Validates an addon package: manifest, analysis, compatibility, contents. */
export async function pack(args: Args) {
  const root = findRoot(process.cwd());
  const pkg = readPkg(root);
  const problems: string[] = [];
  const m = pkg.layr;
  if (!m) problems.push("package.json has no `layr` manifest.");
  else {
    if (!/^[a-z][a-z0-9_]*$/.test(m.id)) problems.push("`layr.id` must be snake_case (letters, digits, underscores).");
    if (!existsSync(join(root, m.entry))) problems.push(`\`layr.entry\` (${m.entry}) does not exist.`);
    if (!m.layr || !semver.validRange(m.layr)) problems.push("`layr.layr` must be a semver range of supported LAYR versions, e.g. ^3.0.0.");
    else if (!semver.satisfies(semver.coerce(layrVersion())?.version ?? "3.0.0", m.layr)) problems.push(`\`layr.layr\` (${m.layr}) does not include the LAYR version used here (${layrVersion()}).`);
  }
  for (const s of ["preinstall", "install", "postinstall"]) if (pkg.scripts?.[s]) problems.push(`Addons must not run install scripts (\`${s}\`).`);
  if (!pkg.peerDependencies?.["@dynshift/layr"]) problems.push("Declare `@dynshift/layr` as a peerDependency.");
  const p = loadProject(root);
  const counts = printDiagnostics(p);
  if (counts.errors) problems.push(`${counts.errors} analyzer error(s).`);
  const npm = spawnSync("npm", ["pack", "--dry-run", "--json"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
  let size = 0;
  try {
    const info = JSON.parse(npm.stdout) as Array<{ size: number; files: Array<{ path: string }> }>;
    size = info[0]?.size ?? 0;
    const files = info[0]?.files.map((f) => f.path) ?? [];
    if (!files.some((f) => f.endsWith(".layr"))) problems.push("The package contains no `.layr` source.");
    if (size > 5 * 1024 * 1024) problems.push(`The package is ${(size / 1024 / 1024).toFixed(1)} MB; the limit is 5 MB.`);
  } catch {
    problems.push("`npm pack --dry-run` failed.");
  }
  if (problems.length) {
    for (const x of problems) console.log(`${c.red("✗")} ${x}`);
    throw new CliError(`${problems.length} problem(s).`);
  }
  console.log(`${c.green("✓")} ${pkg.name}@${pkg.version} is a valid LAYR addon (${(size / 1024).toFixed(1)} kB).`);
  if (!flag(args, "dry-run")) run("npm", ["pack"], root);
}

export async function publish(args: Args) {
  await pack({ _: [], flags: { "dry-run": true } });
  const root = findRoot(process.cwd());
  const extra = process.env.GITHUB_ACTIONS ? ["--provenance"] : [];
  if (flag(args, "dry-run")) extra.push("--dry-run");
  const tag = flag(args, "tag");
  if (typeof tag === "string") extra.push("--tag", tag);
  run("npm", ["publish", "--access", "public", ...extra], root);
  const pkg = readPkg(root);
  console.log(`${c.green("✓")} published ${pkg.name}@${pkg.version}`);
  console.log(c.dim(`To list it on layr.dynshift.com/library, open a pull request adding it to the catalogue (see ${c.bold("https://layr.dynshift.com/library/publish")}).`));
}

/** Copies an installed addon's source into the project so it can be edited. */
export async function eject(args: Args) {
  const root = findRoot(process.cwd());
  const id = args._[0];
  const a = [...discoverAddons(root).values()].find((x) => x.manifest.id === id || x.name === id);
  if (!a) throw new CliError(`\`${id}\` is not an installed addon.`);
  const dest = join(root, "src", "vendor", a.manifest.id);
  mkdirSync(dest, { recursive: true });
  cpSync(join(a.dir, "src"), dest, { recursive: true });
  // Rewrite imports of the package to the vendored copy.
  const entryRel = a.manifest.entry.replace(/^\.\/src\//, "");
  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) {
        if (!p.startsWith(dest)) walk(p);
        continue;
      }
      if (!name.name.endsWith(".layr")) continue;
      const text = readFileSync(p, "utf8");
      const target = relative(join(p, ".."), join(dest, entryRel)).replace(/\\/g, "/");
      const out = text.replaceAll(`'${a.name}'`, `'${target.startsWith(".") ? target : `./${target}`}'`);
      if (out !== text) writeFileSync(p, out);
    }
  };
  walk(join(root, "src"));
  console.log(`${c.green("✓")} ${a.manifest.id} copied to ${relative(root, dest)}; imports now point there.`);
  console.log(c.dim(`You can now remove the package: layr remove ${a.manifest.id}`));
}

/** Generates API docs (Markdown) for an addon's widgets from their params. */
export async function docs() {
  const root = findRoot(process.cwd());
  const p = loadProject(root);
  const lines: string[] = [`# ${readPkg(root).name} API`, ""];
  for (const mod of p.result.project.modules.values()) {
    if (!mod.path.startsWith("src/")) continue;
    for (const comp of mod.comps) {
      if (comp.kind !== "widget") continue;
      lines.push(`## ${comp.name}`, "", "| Param | Type | Required | Default |", "|---|---|---|---|");
      for (const prm of comp.params) lines.push(`| \`${prm.name}\` | ${prm.type ?? "any"} | ${prm.required ? "yes" : ""} | ${prm.init ? `\`${mod.source.slice(prm.init.span)}\`` : ""} |`);
      lines.push("");
    }
  }
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs", "API.md"), lines.join("\n"));
  console.log(`${c.green("✓")} docs/API.md`);
}
