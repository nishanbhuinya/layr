/** Page data for the site's LAYR pages. Each loader returns one lazily built chunk. */
import { index, loaders, nav, slugs } from "virtual:site/docs";

export { index as docIndex, nav as docsNav };

export async function loadDoc(slug: string) {
  const load = (loaders as Record<string, () => Promise<{ default: unknown }>>)[slug];
  if (!load) return { missing: true, slug, title: "Not found", description: "", html: "", toc: [], prev: null, next: null, edit: "" };
  return (await load()).default;
}

export function docPaths() {
  return (slugs as string[]).map((slug) => ({ slug }));
}

/** Sidebar sections, narrowed by a search query (title match). */
export function filterNav(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return nav;
  return (nav as Array<{ title: string; items: Array<{ title: string; slug: string }> }>)
    .map((s) => ({ ...s, items: s.items.filter((i) => i.title.toLowerCase().includes(q) || i.slug.includes(q)) }))
    .filter((s) => s.items.length);
}

export async function loadReference() {
  return (await import("virtual:site/reference")).default;
}

export async function loadWidget(name: string) {
  const ref = await loadReference();
  return ref.widgets.find((w: { slug: string }) => w.slug === name) ?? null;
}

export async function widgetPaths() {
  const ref = await loadReference();
  return ref.widgets.map((w: { slug: string }) => ({ name: w.slug }));
}

export async function loadLibrary() {
  return (await import("virtual:site/library")).default;
}

export async function loadAddon(id: string) {
  const lib = await loadLibrary();
  return lib.find((a: { id: string }) => a.id === id) ?? null;
}

export async function addonPaths() {
  const lib = await loadLibrary();
  return lib.map((a: { id: string }) => ({ id: a.id }));
}

export async function loadHome() {
  const [snippets, lib] = await Promise.all([import("virtual:site/home"), loadLibrary()]);
  return { ...snippets.default, addons: lib.filter((a: { official: boolean }) => a.official) };
}

export function fmtDownloads(n: number | null): string {
  if (n === null || n === undefined) return "";
  return `${new Intl.NumberFormat("en", { notation: "compact" }).format(n)} / week`;
}

const PAGES: Record<string, () => Promise<{ default: unknown }>> = {
  skills: () => import("virtual:site/page/skills"),
  privacy: () => import("virtual:site/page/privacy"),
  v1: () => import("virtual:site/page/v1"),
  publish: () => import("virtual:site/page/publish"),
};

export async function loadPage(name: string) {
  return (await (PAGES[name] as () => Promise<{ default: unknown }>)()).default;
}
export async function loadErrors() {
  const ref = await loadReference();
  return { title: "Diagnostics", description: "Every code the LAYR compiler, analyzer and runtime report, with the fix.", section: "Reference", ...ref.errorsPage };
}

export async function loadCli() {
  const ref = await loadReference();
  return { title: "CLI", description: "Every layr command and its flags.", section: "Reference", ...ref.cliPage };
}

export async function loadApiIndex() {
  const ref = await loadReference();
  return { modules: ref.modules, constructs: ref.constructs };
}