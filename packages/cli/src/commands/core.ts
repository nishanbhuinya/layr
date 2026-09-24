/** dev, build, preview, format, analyze, explain, doctor. */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "@layr-internal/compiler";
import { DIAGNOSTIC_BY_CODE, DIAGNOSTICS } from "@layr-internal/model";
import { layr } from "../vite.ts";
import { findRoot, loadProject, printDiagnostics } from "../project.ts";
import { type Args, banner, c, CliError, flag } from "../ui.ts";

async function viteConfig(root: string, extra: Record<string, unknown> = {}): Promise<import("vite").InlineConfig> {
  const hasConfig = ["vite.config.ts", "vite.config.js", "vite.config.mjs"].some((f) => existsSync(join(root, f)));
  return {
    root,
    configFile: hasConfig ? undefined : false,
    plugins: hasConfig ? [] : [layr({ root })],
    logLevel: "info",
    ...extra,
  } as import("vite").InlineConfig;
}

export async function dev(args: Args) {
  const root = findRoot(process.cwd());
  const { createServer } = await import("vite");
  const port = Number(flag(args, "port") ?? 5173);
  const server = await createServer(await viteConfig(root, { server: { port, host: flag(args, "host") ?? undefined } }));
  await server.listen();
  console.log(banner("dev"));
  server.printUrls();
}

export async function preview(args: Args) {
  const root = findRoot(process.cwd());
  const { preview: vitePreview } = await import("vite");
  const server = await vitePreview(await viteConfig(root, { preview: { port: Number(flag(args, "port") ?? 4173) } }));
  console.log(banner("preview"));
  server.printUrls();
}

/** Builds the client, then prerenders every static route to HTML (static-first hosting). */
export async function build(args: Args) {
  const root = findRoot(process.cwd());
  const p = loadProject(root);
  const counts = printDiagnostics(p);
  if (counts.errors) throw new CliError(`${counts.errors} error(s): fix them before building.`);
  const { build: viteBuild } = await import("vite");
  const base = (flag(args, "base") as string | undefined) ?? p.config.yaml.base ?? "/";
  const outDir = join(root, (flag(args, "out") as string | undefined) ?? "dist");
  console.log(banner("build"));
  await viteBuild(await viteConfig(root, { base, build: { outDir, emptyOutDir: true }, logLevel: "warn" }));
  if (flag(args, "no-prerender")) return;
  const ssrDir = join(root, ".layr", "ssr");
  // Vite turns `build.ssr` into a file path, so the virtual SSR entry is re-exported from a real file.
  const entryFile = join(root, ".layr", "ssr-entry.mjs");
  mkdirSync(dirname(entryFile), { recursive: true });
  writeFileSync(entryFile, `export * from "virtual:layr/ssr";\n`);
  await viteBuild(await viteConfig(root, { base, logLevel: "warn", build: { ssr: entryFile, outDir: ssrDir, emptyOutDir: true, rollupOptions: { output: { entryFileNames: "entry.mjs" } } } }));
  const mod = (await import(pathToFileURL(join(ssrDir, "entry.mjs")).href)) as {
    render: (url: string, data?: unknown) => { html: string; title: string | null; meta: Record<string, unknown>; status: number };
    prerenderRoutes: () => Promise<string[]>;
    loadData: (url: string) => Promise<unknown>;
  };
  const template = readFileSync(join(outDir, "index.html"), "utf8");
  const rendered: string[] = [];
  for (const route of await mod.prerenderRoutes()) {
    const data = await mod.loadData(route);
    const r = mod.render(route, data);
    // The loaded data rides along so the client hydrates with exactly what the server rendered.
    const script = data === undefined ? "" : `<script>window.__LAYR_DATA__=${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
    let html = template.replace(/<div id="app"><\/div>/, () => `<div id="app">${r.html}</div>${script}`);
    if (r.title) html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(r.title as string)}</title>`);
    html = html.replace("</head>", () => `${headTags(r.title, r.meta)}</head>`);
    const file = route === "/" ? join(outDir, "index.html") : join(outDir, route.replace(/^\//, ""), "index.html");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
    rendered.push(route);
  }
  // Static hosts serve 404.html for unknown paths; the client router takes over from there.
  writeFileSync(join(outDir, "404.html"), template);
  rmSync(join(root, ".layr"), { recursive: true, force: true });
  console.log(`${c.green("✓")} prerendered ${rendered.length} route(s): ${rendered.join(", ")}`);
  console.log(`${c.green("✓")} output in ${relative(process.cwd(), outDir) || "."}`);
}

/** Description and social tags from a page's `.meta` (skipped when the template already has them). */
function headTags(title: string | null, meta: Record<string, unknown>): string {
  const tags: string[] = [];
  const desc = typeof meta.description === "string" ? meta.description : null;
  if (desc) tags.push(`<meta name="description" content="${escapeHtml(desc)}">`, `<meta property="og:description" content="${escapeHtml(desc)}">`);
  if (title) tags.push(`<meta property="og:title" content="${escapeHtml(title)}">`);
  if (typeof meta.image === "string") tags.push(`<meta property="og:image" content="${escapeHtml(meta.image)}">`);
  if (typeof meta.canonical === "string") tags.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}">`);
  return tags.join("");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
}

export async function fmt(args: Args) {
  const root = findRoot(process.cwd());
  const p = loadProject(root);
  const check = !!flag(args, "check");
  const targets = args._.length ? p.files.filter((f) => args._.some((a) => f.path.startsWith(a.replace(/\\/g, "/")) || f.abs.startsWith(a))) : p.files;
  let changed = 0;
  let failed = 0;
  for (const f of targets) {
    const r = format(f.text);
    if (r.errors) {
      failed++;
      console.log(`${c.yellow("skip")} ${f.path} ${c.gray(`(${r.errors} syntax error(s))`)}`);
      continue;
    }
    if (!r.changed) continue;
    changed++;
    if (check) console.log(`${c.red("✗")} ${f.path} is not formatted`);
    else {
      writeFileSync(f.abs, r.text);
      console.log(`${c.green("✓")} ${f.path}`);
    }
  }
  if (check && changed) throw new CliError(`${changed} file(s) need formatting. Run ${c.bold("layr format")}.`);
  console.log(c.dim(`${targets.length} file(s), ${changed} ${check ? "unformatted" : "formatted"}${failed ? `, ${failed} skipped` : ""}.`));
}

export async function analyze(args: Args) {
  const root = findRoot(process.cwd());
  const p = loadProject(root);
  const explain = flag(args, "explain") as string | undefined;
  if (explain) return explainRef(p, explain);
  if (flag(args, "json")) {
    const out = p.result.diagnostics.map((d) => {
      const f = p.files.find((x) => x.path === d.file);
      const pos = f ? lineCol(f.text, d.span.start) : { line: 0, column: 0 };
      return { ...d, ...pos, explain: DIAGNOSTIC_BY_CODE.get(d.code)?.title };
    });
    console.log(JSON.stringify({ diagnostics: out, graph: p.result.graph.entries }, null, 2));
    if (out.some((d) => d.severity === "error")) process.exitCode = 1;
    return;
  }
  const counts = printDiagnostics(p, undefined, !!flag(args, "info"));
  const summary = `${counts.errors} error(s), ${counts.warnings} warning(s), ${counts.infos} info`;
  console.log(counts.errors ? c.red(summary) : counts.warnings ? c.yellow(summary) : c.green(`✓ ${summary}`));
  if (counts.errors) process.exitCode = 1;
}

function lineCol(text: string, offset: number) {
  const before = text.slice(0, offset).split("\n");
  return { line: before.length, column: (before[before.length - 1]?.length ?? 0) + 1 };
}

function explainRef(p: ReturnType<typeof loadProject>, ref: string) {
  const [addrPart, key] = ref.includes("#") ? ref.split("#") : [ref.slice(0, ref.lastIndexOf(".")), ref.slice(ref.lastIndexOf(".") + 1)];
  const address = (addrPart as string).includes("::") ? (addrPart as string) : (addrPart as string).replace(".", "::");
  const entries = p.result.graph.entries.filter((e) => e.address === address && (!key || e.key === key));
  console.log(`${c.bold(address)}${key ? `.${key}` : ""}`);
  if (!entries.length) {
    console.log(c.gray("  no reads, writes or injections found"));
    return;
  }
  const order = (e: (typeof entries)[number]) => (e.order === null ? Number.POSITIVE_INFINITY : e.order);
  const injects = entries.filter((e) => e.kind === "inject" || e.kind === "force").sort((a, b) => order(a) - order(b));
  console.log(`  ${c.dim("declared")} ${c.gray("(config)")}`);
  for (const e of entries.filter((x) => x.kind === "write")) console.log(`  ${c.cyan("write")}    ${pos(p, e)}`);
  for (const e of injects) console.log(`  ${c.yellow(e.kind === "force" ? "force " : "inject")}   exeOrder ${e.order ?? "auto"}  ${pos(p, e)}`);
  for (const e of entries.filter((x) => x.kind === "read" || x.kind === "extract")) console.log(`  ${c.green(e.kind.padEnd(8))} ${e.order !== null ? `at exeOrder ${e.order} ` : ""}${pos(p, e)}`);
}

function pos(p: ReturnType<typeof loadProject>, e: { file: string; span: { start: number } }): string {
  const f = p.files.find((x) => x.path === e.file);
  const lc = f ? lineCol(f.text, e.span.start) : { line: 0, column: 0 };
  return c.gray(`${e.file}:${lc.line}:${lc.column}`);
}

export async function explain(args: Args) {
  const code = args._[0]?.toUpperCase();
  if (!code) {
    for (const d of DIAGNOSTICS) console.log(`${c.bold(d.code)} ${d.title}`);
    return;
  }
  const d = DIAGNOSTIC_BY_CODE.get(code);
  if (!d) throw new CliError(`Unknown diagnostic ${code}. Run ${c.bold("layr explain")} for the list.`);
  console.log(`${c.bold(`${d.code}: ${d.title}`)} ${c.gray(`(${d.severity})`)}\n\n${d.explain}`);
  if (d.example) console.log(`\n${c.red("✗")} ${d.example.bad.split("\n").join("\n  ")}\n${c.green("✓")} ${d.example.good.split("\n").join("\n  ")}`);
  console.log(c.gray(`\nhttps://layr.dynshift.com/errors/${d.code}`));
}

export async function doctor() {
  const checks: Array<[string, boolean, string]> = [];
  const [major, minor] = process.versions.node.split(".").map(Number) as [number, number];
  checks.push(["Node ≥ 20", major >= 20, process.versions.node]);
  let root: string | null = null;
  try {
    root = findRoot(process.cwd());
  } catch {
    root = null;
  }
  checks.push(["LAYR project", !!root, root ?? "no layr.yaml"]);
  if (root) {
    const pkg = existsSync(join(root, "package.json")) ? (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }) : {};
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const d of ["@dynshift/layr", "react", "react-dom", "vite"]) checks.push([d, !!deps[d], deps[d] ?? "missing"]);
    const p = loadProject(root);
    const errs = p.result.diagnostics.filter((d) => d.severity === "error").length;
    checks.push(["Compiles", errs === 0, `${p.files.length} file(s), ${errs} error(s)`]);
  }
  void minor;
  for (const [name, ok, detail] of checks) console.log(`${ok ? c.green("✓") : c.red("✗")} ${name.padEnd(16)} ${c.gray(detail)}`);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}
