/**
 * The site's content pipeline (build time only; nothing here ships to the browser):
 *   docs/content/**\/*.md         → virtual:site/docs (loaders) + virtual:site/doc/<slug> (one chunk per page)
 *   the schema + diagnostics + CLI → virtual:site/reference
 *   addons/* + site/content/addons → virtual:site/library, and /addons.json for `layr add`
 *   everything                     → /llms.txt, /llms-full.txt, /sitemap.xml, /robots.txt, /CNAME
 * Code is highlighted here with the VS Code extension's LAYR grammar, into CSS-variable colours
 * the site's light and dark themes define.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";
import { Marked, type Tokens } from "marked";
import { createCssVariablesTheme, createHighlighter, type Highlighter } from "shiki";
import type { Plugin } from "vite";
import { parse as parseYaml } from "yaml";
import { COMMANDS } from "../../packages/cli/src/cli.ts";
import { formatDiagnostic } from "../../packages/cli/src/vite.ts";
import { compileProject, format, readAppConfig } from "../../packages/compiler/src/index.ts";
import { CONSTRUCTS, DIAGNOSTICS, WIDGETS } from "../../packages/model/src/index.ts";
import { exampleApp } from "../src/lib/example-app.ts";
import { wrapSnippet } from "../src/lib/snippet.ts";

export const SITE_URL = "https://layr.dynshift.com";
/** The AdSense publisher (`ca-pub-…`), from the repository variable LAYR_ADSENSE_CLIENT at build time. */
export const ADSENSE_CLIENT = process.env.VITE_ADSENSE_CLIENT ?? "";
export const REPO_URL = "https://github.com/nishanbhuinya/layr";

const SECTIONS = [
  { title: "Start", from: 0 },
  { title: "Language", from: 10 },
  { title: "State and logic", from: 20 },
  { title: "Core concepts", from: 30 },
  { title: "Ship and extend", from: 40 },
];

export interface DocEntry {
  slug: string;
  title: string;
  description: string;
  order: number;
  section: string;
  source: string;
  markdown: string;
}

interface TocItem {
  id: string;
  text: string;
  depth: number;
}

// ------------------------------------------------------------------ highlighting

let highlighter: Promise<Highlighter> | null = null;

function getHighlighter(repo: string): Promise<Highlighter> {
  highlighter ??= (async () => {
    const grammar = JSON.parse(readFileSync(join(repo, "vscode", "syntaxes", "layr.tmLanguage.json"), "utf8"));
    const theme = createCssVariablesTheme({ name: "layr-site", variablePrefix: "--sh-", variableDefaults: {}, fontStyle: true });
    return createHighlighter({
      themes: [theme],
      langs: ["typescript", "tsx", "bash", "json", "yaml", "css", "html", { ...grammar, name: "layr", aliases: ["LAYR"], embeddedLangs: ["typescript"] }],
    });
  })();
  return highlighter;
}

const LANG_ALIASES: Record<string, string> = { ts: "typescript", js: "typescript", sh: "bash", shell: "bash", powershell: "bash", ps1: "bash", yml: "yaml", jsx: "tsx" };

function highlight(h: Highlighter, code: string, lang: string): string {
  const l = LANG_ALIASES[lang] ?? lang;
  const known = h.getLoadedLanguages().includes(l);
  const html = h.codeToHtml(code.replace(/\n$/, ""), { lang: known ? l : "text", theme: "layr-site" });
  return html.replace(/ style="[^"]*"/, "").replace(/ tabindex="0"/, "");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
}

/** Playground links carry the code in the URL hash, deflated (no server involved). */
export function playgroundHref(code: string): string {
  return `/playground#code=${deflateRawSync(Buffer.from(code, "utf8")).toString("base64url")}`;
}

/**
 * A highlighted block framed as an editor pane: language, Copy, and for a runnable LAYR snippet
 * (one that declares a Page) "Open in playground". The Prose component wires the buttons.
 */
export function codeBlock(h: Highlighter, code: string, lang: string, title?: string): string {
  const l = LANG_ALIASES[lang] ?? lang;
  const label = title ?? (l === "typescript" ? "TypeScript" : l === "layr" ? "LAYR" : l === "bash" ? "Terminal" : l ? l.toUpperCase() : "Text");
  const runnable = l === "layr" && /\bPage\s*\(/.test(code) && [...code.matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)].every((m) => previewable(m[1] as string));
  const open = runnable ? `<a class="open" href="${playgroundHref(code)}">Open in playground</a>` : "";
  return `<figure class="code" data-lang="${escapeHtml(l || "text")}"><figcaption><span>${escapeHtml(label)}</span>${open}<button type="button" class="copy" aria-label="Copy code">Copy</button></figcaption>${highlight(h, code, lang)}</figure>`;
}

/** A code block the Prose component turns into a live preview (the block stays readable without JS). */
export function liveBlock(block: string, run: string, src = run): string {
  const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
  return `<div class="live" data-run="${b64(run)}" data-src="${b64(src)}" data-play="${playgroundHref(run)}">${block}</div>`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[`'"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The official addons' LAYR sources: examples that import `@dynshift/layr-<name>` compile against them. */
export interface AddonSources {
  /** npm name → project path of the entry file. */
  addons: Record<string, string>;
  files: Array<{ path: string; text: string }>;
}

let addonCache: AddonSources | null = null;
/** The repository root; the plugin sets it from Vite's root, scripts get it from this file's location. */
let repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
export function addonSources(repo = repoRoot): AddonSources {
  if (addonCache) return addonCache;
  const out: AddonSources = { addons: {}, files: [] };
  const dir = join(repo, "addons");
  for (const name of existsSync(dir) ? readdirSync(dir) : []) {
    const pkgFile = join(dir, name, "package.json");
    if (!existsSync(pkgFile)) continue;
    const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
    if (!pkg.layr?.entry) continue;
    const entry = String(pkg.layr.entry).replace(/^\.\//, "");
    out.addons[pkg.name] = `addons/${name}/${entry}`;
    for (const f of walk(join(dir, name, "src"), ".layr")) out.files.push({ path: relative(repo, f).replace(/\\/g, "/"), text: readFileSync(f, "utf8").replace(/\r\n/g, "\n") });
  }
  addonCache = out;
  return out;
}

/** The site's own app (its theme): every example runs in it. */
export function siteAppSource(repo = repoRoot): string {
  return readFileSync(join(repo, "site", "src", "app.layr"), "utf8").replace(/\r\n/g, "\n");
}

/** Compiles a snippet as the page of a project that has the official addons installed. */
export function compileSnippet(code: string, appSource?: string) {
  const src = addonSources();
  const path = "src/pages/index.layr";
  // Every example runs in the site's app (its theme tokens); a snippet's own App adds to it.
  const app = exampleApp(readAppConfig, appSource ?? siteAppSource(), code, path);
  const r = compileProject([{ path, text: code }, ...src.files], { addons: src.addons, theme: app.theme, designScale: app.designScale });
  return { ...r, diagnostics: r.diagnostics.filter((d) => !d.file || d.file === path) };
}


/**
 * The code a docs preview runs: the snippet itself when it declares a Page, or a lone object
 * wrapped in a minimal page. Only code that compiles cleanly gets a preview.
 */
/** Modules a preview can load: LAYR, React and the official addons. */
function previewable(spec: string): boolean {
  return spec === "react" || spec.startsWith("react/") || spec === "@dynshift/layr" || spec.startsWith("@dynshift/layr/") || spec.startsWith("@dynshift/layr-");
}

export function runnable(code: string): string | null {
  // A snippet that imports your own files or other packages is shown, not run.
  for (const m of code.matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)) if (!previewable(m[1] as string)) return null;
  const run = wrapSnippet(code.trim())?.run ?? null;
  if (!run) return null;
  return compileSnippet(run).diagnostics.some((d) => d.severity === "error") ? null : run;
}

/** Markdown → HTML with anchored headings, a table of contents and highlighted code. */
export function renderMarkdown(h: Highlighter, md: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, { tokens, depth }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const base = slugify(inner) || "section";
        const n = used.get(base) ?? 0;
        used.set(base, n + 1);
        const id = n ? `${base}-${n}` : base;
        // The rail renders plain text, so entities from the Markdown renderer are decoded here.
        const plain = inner
          .replace(/<[^>]+>/g, "")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&");
        if (depth === 2 || depth === 3) toc.push({ id, text: plain, depth });
        if (depth === 1) return `<h1 id="${id}">${inner}</h1>\n`;
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${depth}>\n`;
      },
      code({ text, lang }: Tokens.Code) {
        const [l = "", ...flags] = (lang ?? "").split(/\s+/);
        const block = codeBlock(h, text, l);
        const run = l === "layr" && !flags.includes("noexec") ? runnable(text) : null;
        // noexec blocks are shown as written (deliberate mistakes in the diagnostics reference).
        // A runnable snippet becomes a live preview (the Prose component mounts it); the code stays readable without JS.
        return run ? liveBlock(block, run, text.trim()) : block;
      },
      blockquote(this: { parser: { parse: (t: Tokens.Generic[]) => string } }, { tokens, text }: Tokens.Blockquote) {
        const inner = this.parser.parse(tokens);
        // `> **Try it**` starts a callout: edits to make in the example above, one per line.
        if (/^\s*\*\*Try it\*\*/.test(text)) return `<aside class="try">${inner.replace(/<strong>Try it<\/strong>:?\s*/, '<span class="try-label">Try it</span>')}</aside>\n`;
        return `<blockquote>${inner}</blockquote>\n`;
      },
      table(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Table) {
        const cell = (c: Tokens.TableCell, tag: string) => `<${tag}${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</${tag}>`;
        const head = `<tr>${token.header.map((c) => cell(c, "th")).join("")}</tr>`;
        const rows = token.rows.map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`).join("");
        return `<div class="table" role="region" tabindex="0"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>\n`;
      },
      link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, { href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href) && !href.startsWith(SITE_URL);
        return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}${external ? ' rel="noopener"' : ""}>${text}</a>`;
      },
    },
  });
  const html = marked.parse(md, { async: false }) as string;
  return { html, toc };
}

export function inlineMarkdown(md: string): string {
  return new Marked({ gfm: true }).parseInline(md, { async: false }) as string;
}

// ------------------------------------------------------------------ docs

function frontmatter(text: string): { data: Record<string, unknown>; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  return { data: (parseYaml(m[1] as string) ?? {}) as Record<string, unknown>, body: text.slice(m[0].length) };
}

function walk(dir: string, ext: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

export function readDocs(repo: string): DocEntry[] {
  const docs = walk(join(repo, "docs", "content"), ".md").map((file) => {
    const { data, body } = frontmatter(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
    const order = Number(data.order ?? 99);
    const section = [...SECTIONS].reverse().find((s) => order >= s.from)?.title ?? "Guides";
    return {
      slug: basename(file, ".md"),
      title: String(data.title ?? basename(file, ".md")),
      description: String(data.description ?? ""),
      order,
      section,
      source: relative(repo, file).replace(/\\/g, "/"),
      markdown: body,
    };
  });
  return docs.sort((a, b) => a.order - b.order);
}

function nav(docs: DocEntry[]) {
  return SECTIONS.map((s) => ({
    title: s.title,
    items: docs.filter((d) => d.section === s.title).map((d) => ({ slug: d.slug, title: d.title, description: d.description, href: `/docs/${d.slug}` })),
  })).filter((s) => s.items.length);
}

// ------------------------------------------------------------------ reference

function typeLabel(k: { type: string; values?: readonly string[] }): string {
  if (k.type === "enum") return (k.values ?? []).join(" | ");
  return k.values?.length ? `${k.type} | ${k.values.join(" | ")}` : k.type;
}

async function reference(repo: string) {
  const h = await getHighlighter(repo);
  const widgets = WIDGETS.map((w) => ({
    name: w.name,
    slug: w.name.toLowerCase(),
    module: w.module,
    aliases: [...(w.aliases ?? [])],
    doc: inlineMarkdown(w.doc),
    summary: w.doc.replace(/`/g, "").split(/(?<=\.)\s/)[0] ?? w.doc,
    example: renderMarkdown(h, `\`\`\`layr\n${w.example}\n\`\`\``).html,
    slots: w.slots.map((s) => ({ name: s.name, kind: s.kind, note: [s.default ? "default" : "", s.required ? "required" : ""].filter(Boolean).join(", ") })),
    events: [...(w.events ?? [])],
    primaryAction: w.primaryAction ?? "",
    keys: w.keys.map((k) => ({ name: k.name, type: typeLabel(k), default: k.default ?? "", aliases: (k.aliases ?? []).join(", "), doc: inlineMarkdown(k.doc) })),
    groups: (w.groups ?? []).map((g) => ({ name: g.name, keys: Object.keys(g.keys).join(", "), doc: inlineMarkdown(g.doc) })),
  }));
  const modules = [...new Set(widgets.map((w) => w.module))].map((m) => ({ name: m, title: m.charAt(0).toUpperCase() + m.slice(1), widgets: widgets.filter((w) => w.module === m).map((w) => ({ name: w.name, slug: w.slug, summary: w.summary })) }));
  const constructs = CONSTRUCTS.map((c) => ({ name: c.name, doc: inlineMarkdown(c.doc), modifiers: c.modifiers.map((m) => `.${m}`).join(" "), example: codeBlock(h, c.example, "layr") }));
  const diagnostics = DIAGNOSTICS.map((d) => ({
    code: d.code,
    severity: d.severity,
    title: d.title,
    explain: inlineMarkdown(d.explain),
    bad: d.example ? codeBlock(h, d.example.bad, "layr") : "",
    good: d.example ? codeBlock(h, d.example.good, "layr") : "",
    family: d.code.slice(0, 2),
  }));
  const commands = Object.entries(COMMANDS).map(([name, c]) => ({ name, summary: c.summary, usage: c.usage ?? `layr ${name}`, usageHtml: codeBlock(h, c.usage ?? `layr ${name}`, "bash") }));

  // Whole pages as Markdown, rendered like the docs (tables, code panes, live examples).
  const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  for (const w of WIDGETS) {
    const entry = widgets.find((x) => x.name === w.name);
    if (!entry) continue;
    const headMd = [
      `# ${w.name}`,
      "",
      w.doc,
      w.aliases?.length ? `\nAlso written ${w.aliases.map((a) => `\`${a}\``).join(", ")}; \`layr format\` rewrites these to \`${w.name}\`.` : "",
    ].join("\n");
    const md = [
      "## Example",
      "",
      "```layr",
      w.example,
      "```",
      "",
      "## Config keys",
      "",
      "| Key | Type | Default | Meaning |",
      "|---|---|---|---|",
      ...w.keys.map((k) => `| \`${k.name}\`${k.aliases?.length ? ` <small>(${k.aliases.join(", ")})</small>` : ""} | ${cell(typeLabel(k))} | ${k.default ? `\`${cell(k.default)}\`` : ""} | ${cell(k.doc)} |`),
      ...(w.groups ?? []).map((g) => `\nGroup \`.${g.name}(${Object.keys(g.keys).join(", ")})\`: ${g.doc}`),
      w.slots.length ? `\n## Slots\n\n${w.slots.map((s) => `- \`.${s.name}\`: ${s.kind === "many" ? "several objects" : s.kind === "text" ? "text" : "one object"}${s.default ? ", the default slot" : ""}${s.required ? ", required" : ""}`).join("\n")}` : "",
      w.primaryAction || w.events?.length ? `\n## Events\n\n${w.primaryAction ? `\`.fnc\` runs on \`${w.primaryAction}\`. ` : ""}${w.events?.length ? `\`.on(...)\` accepts ${w.events.map((e) => `\`${e}\``).join(", ")}.` : ""}` : "",
    ].join("\n");
    const r = renderMarkdown(h, md);
    Object.assign(entry, { head: renderMarkdown(h, headMd).html, html: r.html, toc: r.toc });
  }

  const FAMILIES: Record<string, string> = { L0: "Syntax", L1: "Names and types", L2: "Layout", L3: "Export, Extract, Inject", L4: "Design Scale", L5: "Motion", L6: "Accessibility", L7: "Addons", L8: "Assets", L9: "Interop" };
  const errorsMd = [
    "# Diagnostics",
    "",
    "Every problem the compiler, the analyzer or the runtime reports has a code. `layr explain <code>` prints the same explanation in your terminal, and your editor shows it on hover.",
    ...Object.entries(FAMILIES).flatMap(([fam, title]) => {
      const list = DIAGNOSTICS.filter((d) => d.code.startsWith(fam));
      if (!list.length) return [];
      return [
        "",
        `## ${fam}: ${title}`,
        ...list.flatMap((d) => [
          "",
          `<a id="${d.code}"></a>`,
          "",
          `### ${d.code}: ${d.title}`,
          "",
          `**${d.severity}.** ${d.explain}`,
          ...(d.example ? ["", "Wrong:", "", "```layr noexec", d.example.bad, "```", "", "Right:", "", "```layr", d.example.good, "```"] : []),
        ]),
      ];
    }),
  ].join("\n");
  const errorsPage = renderMarkdown(h, errorsMd);

  const cliMd = [
    "# CLI",
    "",
    "`layr` ships in `@dynshift/layr`. Run it with `npx layr`, or through your package manager's scripts.",
    "",
    "| Command | What it does |",
    "|---|---|",
    ...commands.map((c) => `| [\`layr ${c.name}\`](#${c.name}) | ${cell(c.summary)} |`),
    ...commands.flatMap((c) => ["", `<a id="${c.name}"></a>`, "", `## layr ${c.name}`, "", `${c.summary}.`, "", "```bash", c.usage.startsWith("layr") ? c.usage.split(" | ").join("\n") : `layr ${c.name}`, "```"]),
  ].join("\n");
  const cliPage = renderMarkdown(h, cliMd);

  return { widgets, modules, constructs, diagnostics, commands, errorsPage, cliPage };
}

// ------------------------------------------------------------------ library

interface LibraryEntry {
  id: string;
  npm: string;
  name: string;
  description: string;
  layr: string;
  categories: string[];
  tags: string[];
  official: boolean;
  repository: string;
  version: string;
  downloads: number | null;
  install: string;
  readme: string;
  examples: Array<{ name: string; html: string }>;
  widgets: string[];
}

async function fetchJson<T>(url: string): Promise<T | null> {
  if (process.env.SITE_OFFLINE) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

function titleCase(id: string): string {
  return id
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

async function library(repo: string, siteRoot: string): Promise<LibraryEntry[]> {
  const h = await getHighlighter(repo);
  const out: LibraryEntry[] = [];
  const addonsDir = join(repo, "addons");
  for (const dir of existsSync(addonsDir) ? readdirSync(addonsDir) : []) {
    const pkgFile = join(addonsDir, dir, "package.json");
    if (!existsSync(pkgFile)) continue;
    const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
    const m = pkg.layr ?? {};
    const readmeFile = join(addonsDir, dir, "README.md");
    const readme = existsSync(readmeFile) ? renderMarkdown(h, readFileSync(readmeFile, "utf8").replace(/\r\n/g, "\n").replace(/^# .*\n/, "")).html : "";
    // Examples import the addon by its npm name, as a project using it would, and run live.
    const examples = walk(join(addonsDir, dir, "examples"), ".layr").map((f) => {
      const code = readFileSync(f, "utf8").replace(/\r\n/g, "\n").trimEnd().replace(/from '\.\.\/src\/index\.layr'/g, `from '${pkg.name}'`);
      const block = codeBlock(h, code, "layr", `examples/${basename(f)}`);
      const run = runnable(code);
      return { name: basename(f), html: run ? liveBlock(block, run) : block };
    });
    // Widget addons list their widgets; a utility addon (fonts, helpers) has no LAYR entry.
    const entryFile = m.entry ? join(addonsDir, dir, String(m.entry).replace(/^\.\//, "")) : "";
    const entry = entryFile && existsSync(entryFile) ? readFileSync(entryFile, "utf8") : "";
    const widgets = [...entry.matchAll(/Widget\(\s*\.name\((\w+)\)/g)].map((x) => x[1] as string);
    out.push({
      id: m.id ?? dir,
      npm: pkg.name,
      name: titleCase(m.id ?? dir),
      description: pkg.description ?? "",
      layr: m.layr ?? "",
      categories: m.categories ?? [],
      tags: m.tags ?? [],
      official: true,
      repository: `${REPO_URL}/tree/main/addons/${dir}`,
      version: pkg.version,
      downloads: null,
      install: `layr add ${m.id ?? dir}`,
      readme,
      examples,
      widgets,
    });
  }
  // Community entries: one YAML file each, added by pull request (the repository is the review queue).
  for (const f of walk(join(siteRoot, "content", "addons"), ".yaml")) {
    const y = parseYaml(readFileSync(f, "utf8")) as Record<string, unknown>;
    if (!y?.id || !y.npm) throw new Error(`${relative(repo, f)}: a Library entry needs id and npm.`);
    out.push({
      id: String(y.id),
      npm: String(y.npm),
      name: String(y.name ?? titleCase(String(y.id))),
      description: String(y.description ?? ""),
      layr: String(y.layr ?? ""),
      categories: (y.categories as string[]) ?? [],
      tags: (y.tags as string[]) ?? [],
      official: false,
      repository: String(y.repository ?? ""),
      version: "",
      downloads: null,
      install: `layr add ${String(y.npm)}`,
      readme: y.readme ? renderMarkdown(h, String(y.readme)).html : "",
      examples: [],
      widgets: (y.widgets as string[]) ?? [],
    });
  }
  // npm facts (version, weekly downloads) refresh on the scheduled rebuild; offline builds skip them.
  await Promise.all(
    out.map(async (e) => {
      const latest = await fetchJson<{ version: string }>(`https://registry.npmjs.org/${e.npm}/latest`);
      if (latest?.version) e.version = latest.version;
      const dl = await fetchJson<{ downloads: number }>(`https://api.npmjs.org/downloads/point/last-week/${e.npm}`);
      if (typeof dl?.downloads === "number") e.downloads = dl.downloads;
    }),
  );
  return out.sort((a, b) => Number(b.official) - Number(a.official) || a.id.localeCompare(b.id));
}

// ------------------------------------------------------------------ home page material

/** Highlighted source split into one HTML string per line (for line-level views). */
function highlightLines(h: Highlighter, code: string, lang: string): string[] {
  const html = h.codeToHtml(code.replace(/\n$/, ""), { lang, theme: "layr-site" });
  const inner = html.replace(/^[\s\S]*?<code>/, "").replace(/<\/code>[\s\S]*$/, "");
  return inner.split("\n").map((l) => l.replace(/^<span class="line">/, "").replace(/<\/span>$/, ""));
}

/** One CSS rule per line, as it ships. */
function prettyCss(css: string): string {
  return css.replace(/}(?=.)/g, "}\n").replace(/\n{2,}/g, "\n").trim();
}

async function home(repo: string, siteRoot: string) {
  const h = await getHighlighter(repo);
  const read = (p: string) => readFileSync(join(siteRoot, p), "utf8").replace(/\r\n/g, "\n").trimEnd();
  // Shown fully expanded, one key per line, the way LAYR reads in the docs (compiled as written).
  const expanded = (code: string) => {
    const r = format(code, { width: 44 });
    return r.errors ? code : r.text.trimEnd();
  };
  // The hero's page: compiled and run in the browser like every other example on the site.
  const demo = read("content/home/demo.layr");
  if (compileSnippet(demo).diagnostics.some((d) => d.severity === "error")) throw new Error("content/home/demo.layr must compile cleanly");

  // Real compiler output for a small file: the CSS and the React module it becomes.
  const shape = read("content/home/shape.layr");
  const compiled = compileProject([{ path: "src/pages/index.layr", text: shape }], { theme: exampleApp(readAppConfig, siteAppSource(repo), shape).theme });
  const mod = compiled.modules.get("src/pages/index.layr");
  if (!mod || compiled.diagnostics.some((d) => d.severity === "error")) throw new Error("content/home/shape.layr must compile cleanly");
  const js = mod.js.trim();

  // Real diagnostics for a file with two deliberate mistakes.
  // Compiled in the expanded form it is shown in, so the report's line numbers match the pane.
  const mistakes = expanded(read("content/home/mistakes.layr"));
  const bad = compileProject([{ path: "src/pages/checkout.layr", text: mistakes }], { theme: exampleApp(readAppConfig, siteAppSource(repo), mistakes).theme });
  const report = bad.diagnostics
    .filter((d) => d.severity !== "info")
    .map((d) => formatDiagnostic({ ...d, file: "src/pages/checkout.layr" }, mistakes, repo))
    .join("\n\n");

  const eei = read("content/home/eei.layr");
  const eeiCheck = compileSnippet(eei);
  if (eeiCheck.diagnostics.some((d) => d.severity === "error")) throw new Error("content/home/eei.layr must compile cleanly");

  return {
    // The hero's ground: this page's own source (the page and its widgets).
    field: ["src/pages/index.layr", "src/widgets/home.layr", "src/widgets/shell.layr", "content/home/demo.layr"].map(read).join("\n"),
    demo: { code: demo, lines: highlightLines(h, demo, "layr"), html: codeBlock(h, demo, "layr", "src/pages/room.layr"), playground: playgroundHref(demo), file: "src/pages/room.layr" },
    shape: { source: codeBlock(h, expanded(shape), "layr", "src/pages/profile.layr"), css: codeBlock(h, prettyCss(mod.css), "css", "Compiled CSS"), js: codeBlock(h, js, "typescript", "Compiled React module"), playground: playgroundHref(shape) },
    mistakes: { source: codeBlock(h, mistakes, "layr", "src/pages/checkout.layr"), report, count: bad.diagnostics.filter((d) => d.severity === "error").length },
    eei: codeBlock(h, expanded(eei), "layr", "src/pages/store.layr"),
    eeiPlay: playgroundHref(expanded(eei)),
    react: codeBlock(h, expanded(read("content/home/react.layr")), "layr", "src/pages/stats.layr"),
    install: codeBlock(h, "npm create @dynshift/layr@latest my-app\ncd my-app\nnpm run dev", "bash", "Terminal"),
  };
}

// ------------------------------------------------------------------ plugin

const PREFIX = "\0site:";

/** The runner frame's page: the LAYR runtime in a real viewport, always on a light stage. */
function runHtml(script: string, css: string[] = []): string {
  const links = css.map((c) => `<link rel="stylesheet" href="/${c}">`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>LAYR runner</title>${links}<style>html,body{margin:0}html{background:#f4efe7;color:#1c1917;font-family:"Geist Variable",system-ui,sans-serif;color-scheme:light}@media (prefers-color-scheme:dark){html:not([data-theme=light]){background:#121110;color:#f3ede6;color-scheme:dark}}html[data-theme=dark]{background:#121110;color:#f3ede6;color-scheme:dark}</style></head><body><div id="app"></div><script type="module" src="${script}"></script></body></html>`;
}

export function siteContent(): Plugin {
  let siteRoot = "";
  let repo = "";
  let docs: DocEntry[] = [];
  let lib: Promise<LibraryEntry[]> | null = null;
  let isSsr = false;
  let isBuild = false;
  let runRef = "";

  const load = () => {
    docs = readDocs(repo);
    lib = null;
  };
  const getLib = () => (lib ??= library(repo, siteRoot));

  return {
    name: "layr-site-content",
    enforce: "pre",
    configResolved(c) {
      siteRoot = c.root;
      repo = resolve(siteRoot, "..");
      repoRoot = repo;
      addonCache = null;
      isSsr = !!c.build.ssr;
      isBuild = c.command === "build";
      load();
    },
    buildStart() {
      if (isBuild && !isSsr) runRef = this.emitFile({ type: "chunk", id: resolve(siteRoot, "src/run/main.ts"), name: "run" });
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if ((req.url ?? "").split("?")[0] !== "/run.html") return next();
        res.setHeader("content-type", "text/html");
        res.end(await server.transformIndexHtml("/run.html", runHtml("/src/run/main.ts")));
      });
      const watched = [join(repo, "docs", "content"), join(repo, "addons"), join(siteRoot, "content")];
      server.watcher.add(watched);
      const onChange = (file: string) => {
        if (!watched.some((w) => file.startsWith(w))) return;
        load();
        for (const m of server.moduleGraph.idToModuleMap.values()) if (m.id?.startsWith(PREFIX)) server.moduleGraph.invalidateModule(m);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
    },
    transformIndexHtml(html) {
      // AdSense, as on dynshift.com: the ownership tag and the loader on every built page. The
      // loader also delivers Google's certified consent message (EEA, UK, Switzerland), so it is not
      // gated behind a banner of ours. Ad slots stay empty until their unit ids are configured.
      // Local dev loads nothing from Google.
      const client = isBuild ? ADSENSE_CLIENT : "";
      const tags = client
        ? `<meta name="google-adsense-account" content="${escapeHtml(client)}"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}" crossorigin="anonymous"></script>`
        : "";
      return html.replace("%LAYR_HEAD%", tags);
    },
    resolveId(id) {
      if (id.startsWith("virtual:site/")) return PREFIX + id.slice("virtual:site/".length);
      return null;
    },
    async load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const what = id.slice(PREFIX.length);
      if (what === "docs") {
        const loaders = docs.map((d) => `${JSON.stringify(d.slug)}: () => import("virtual:site/doc/${d.slug}")`).join(",\n");
        return `export const nav = ${JSON.stringify(nav(docs))};\nexport const slugs = ${JSON.stringify(docs.map((d) => d.slug))};\nexport const loaders = {\n${loaders}\n};\nexport const index = ${JSON.stringify(docs.map((d) => ({ slug: d.slug, title: d.title, description: d.description, section: d.section })))};\n`;
      }
      if (what.startsWith("doc/")) {
        const slug = what.slice(4);
        const i = docs.findIndex((d) => d.slug === slug);
        const d = docs[i];
        if (!d) throw new Error(`No doc ${slug}`);
        const { html, toc } = renderMarkdown(await getHighlighter(repo), d.markdown);
        const link = (x: DocEntry | undefined) => (x ? { slug: x.slug, title: x.title, href: `/docs/${x.slug}` } : null);
        const doc = { slug, title: d.title, description: d.description, section: d.section, html, toc, prev: link(docs[i - 1]), next: link(docs[i + 1]), edit: `${REPO_URL}/edit/main/${d.source}` };
        return `export default ${JSON.stringify(doc)};`;
      }
      if (what === "reference") return `export default ${JSON.stringify(await reference(repo))};`;
      if (what === "search") {
        // Command-palette index: pages, their headings, widgets, diagnostics and commands.
        const ref = await reference(repo);
        const h = await getHighlighter(repo);
        const items: Array<{ t: string; s: string; h: string; k: string }> = [];
        for (const d of docs) {
          items.push({ t: d.title, s: d.description, h: `/docs/${d.slug}`, k: "page" });
          for (const x of renderMarkdown(h, d.markdown).toc) items.push({ t: x.text, s: d.title, h: `/docs/${d.slug}#${x.id}`, k: "section" });
        }
        for (const w of ref.widgets) items.push({ t: w.name, s: w.summary, h: `/api/${w.slug}`, k: "widget" });
        for (const d of ref.diagnostics) items.push({ t: `${d.code} ${d.title}`, s: d.severity, h: `/errors#${d.code}`, k: "diagnostic" });
        for (const c of ref.commands) items.push({ t: `layr ${c.name}`, s: c.summary, h: `/cli#${c.name}`, k: "command" });
        for (const p of [["Playground", "/playground"], ["Library", "/library"], ["AI Skill", "/skills"], ["API reference", "/api"], ["Diagnostics", "/errors"], ["CLI", "/cli"]]) items.push({ t: p[0] as string, s: "", h: p[1] as string, k: "page" });
        return `export default ${JSON.stringify(items)};`;
      }
      if (what === "library") return `export default ${JSON.stringify(await getLib())};`;
      if (what === "addons-src") {
        addonCache = null;
        return `export default ${JSON.stringify(addonSources(repo))};`;
      }
      if (what.startsWith("page/")) {
        // Plain Markdown pages under site/content/pages (skills, privacy, v1, publishing).
        const name = what.slice(5);
        const file = join(siteRoot, "content", "pages", `${name}.md`);
        const { data, body } = frontmatter(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
        const { html, toc } = renderMarkdown(await getHighlighter(repo), body);
        return `export default ${JSON.stringify({ slug: name, title: String(data.title ?? name), description: String(data.description ?? ""), section: String(data.section ?? ""), html, toc, edit: `${REPO_URL}/edit/main/site/content/pages/${name}.md` })};`;
      }
      if (what === "examples") {
        // Playground examples: one file each, in order; the title map keeps the menu readable.
        const titles: Record<string, string> = { hello: "Hello: fill and adaptation", "design-scale": "Design Scale across frames", state: "State and lists", inject: "Export, Extract, Inject", animate: "Animate" };
        const list = walk(join(siteRoot, "content", "playground"), ".layr")
          .sort()
          .map((f) => {
            const id = basename(f, ".layr").replace(/^\d+-/, "");
            return { id, title: titles[id] ?? id, code: readFileSync(f, "utf8").replace(/\r\n/g, "\n") };
          });
        return `export default ${JSON.stringify(list)};`;
      }
      if (what === "app-src") return `export default ${JSON.stringify(siteAppSource(repo))};`;
      if (what === "home") return `export default ${JSON.stringify(await home(repo, siteRoot))};`;
      return null;
    },
    async generateBundle(_opts, bundle) {
      if (isSsr) return;
      if (runRef) {
        const file = this.getFileName(runRef);
        const css = [...((bundle[file] as { viteMetadata?: { importedCss?: Set<string> } }).viteMetadata?.importedCss ?? [])];
        this.emitFile({ type: "asset", fileName: "run.html", source: runHtml(`/${file}`, css) });
      }
      const entries = await getLib();
      const index = {
        $schema: `${SITE_URL}/addons.schema.json`,
        generated: new Date().toISOString(),
        addons: entries.map((e) => ({ id: e.id, npm: e.npm, name: e.name, description: e.description, layr: e.layr, categories: e.categories, official: e.official, repository: e.repository })),
      };
      this.emitFile({ type: "asset", fileName: "addons.json", source: `${JSON.stringify(index, null, 2)}\n` });

      const ref = await reference(repo);
      const pages = ["/", "/docs", ...docs.map((d) => `/docs/${d.slug}`), "/api", ...ref.widgets.map((w) => `/api/${w.slug}`), "/errors", "/cli", "/playground", "/library", ...entries.map((e) => `/library/${e.id}`), "/library/publish", "/skills", "/privacy"];
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join("\n")}\n</urlset>\n` });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` });
      this.emitFile({ type: "asset", fileName: "CNAME", source: "layr.dynshift.com\n" });

      // llms.txt (https://llmstxt.org): an index for agents, and the whole documentation in one file.
      const bySection = nav(docs)
        .map((s) => `## ${s.title}\n\n${s.items.map((i) => `- [${i.title}](${SITE_URL}/docs/${i.slug}.md): ${docs.find((d) => d.slug === i.slug)?.description ?? ""}`).join("\n")}`)
        .join("\n\n");
      const llms = `# LAYR\n\n> LAYR (Layout Authoritative Yet Responsive) is a compiled UI language for the web: \`.layr\` files compile to React components and static CSS, with Design Scale units, deterministic layout adaptation and Export/Extract/Inject. Install: \`npm create @dynshift/layr@latest\`. npm: @dynshift/layr (CLI: layr).\n\nRead the Skill rules before writing LAYR: ${SITE_URL}/skills. Every widget and config key: ${SITE_URL}/api. Every diagnostic: ${SITE_URL}/errors.\n\n${bySection}\n\n## Optional\n\n- [Full documentation](${SITE_URL}/llms-full.txt): every page in one file\n- [Addon index](${SITE_URL}/addons.json): official and listed addons\n`;
      this.emitFile({ type: "asset", fileName: "llms.txt", source: llms });
      const full = docs.map((d) => `# ${d.title}\n\nSource: ${SITE_URL}/docs/${d.slug}\n\n${d.markdown.replace(/^# .*\n+/, "").trim()}\n`).join("\n\n---\n\n");
      this.emitFile({ type: "asset", fileName: "llms-full.txt", source: `# LAYR documentation\n\n${full}` });
      for (const d of docs) this.emitFile({ type: "asset", fileName: `docs/${d.slug}.md`, source: `# ${d.title}\n\n${d.markdown.replace(/^# .*\n+/, "").trim()}\n` });
    },
  };
}
