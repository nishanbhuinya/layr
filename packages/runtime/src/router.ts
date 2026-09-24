/** Page routing (React-free core). Pages register themselves; `go()` navigates by page name. */
import { Signal } from "./signals.ts";

export interface PageDef {
  name: string;
  route: string;
  component: unknown;
  /** Static metadata, or metadata computed from the route params and the loaded data. */
  meta?: Record<string, unknown> | ((route: Record<string, string>, data: unknown) => Record<string, unknown>);
  load?: (route: Record<string, string>) => Promise<unknown>;
  /** For a dynamic route: every set of params to prerender. */
  paths?: () => Promise<Array<Record<string, unknown>>>;
}

/** A page's metadata for one route and its loaded data. */
export function metaFor(page: PageDef | null, params: Record<string, string> = {}, data?: unknown): Record<string, unknown> {
  if (!page?.meta) return {};
  if (typeof page.meta !== "function") return page.meta;
  try {
    return page.meta(params, data);
  } catch {
    // Metadata that reads data not yet loaded resolves once it arrives.
    return {};
  }
}

export interface Location {
  path: string;
  page: PageDef | null;
  params: Record<string, string>;
  query: Record<string, string>;
}

const pages = new Map<string, PageDef>();
let base = "";

export const location = new Signal<Location>({ path: "/", page: null, params: {}, query: {} });

export function page(def: PageDef) {
  pages.set(def.name, def);
  // A page registered after the first match (lazy module) may be the current one.
  if (!location.peek().page && typeof window !== "undefined") sync();
}

export function allPages(): PageDef[] {
  return [...pages.values()];
}

export function setBase(b: string) {
  base = b.replace(/\/$/, "");
}

function compile(route: string): { re: RegExp; keys: string[] } {
  const keys: string[] = [];
  const pattern = route
    .replace(/\/$/, "")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/:(\w+)/g, (_m, k: string) => {
      keys.push(k);
      return "([^/]+)";
    })
    .replace(/\*/g, ".*");
  return { re: new RegExp(`^${pattern || ""}/?$`), keys };
}

export function match(path: string): { page: PageDef; params: Record<string, string> } | null {
  const ranked = [...pages.values()].sort((a, b) => specificity(b.route) - specificity(a.route));
  for (const p of ranked) {
    const { re, keys } = compile(p.route);
    const m = path.match(re);
    if (m) return { page: p, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1] ?? "")])) };
  }
  return null;
}

function specificity(route: string): number {
  return route.split("/").reduce((s, part) => s + (part.startsWith(":") ? 1 : part === "*" ? 0 : 3), 0);
}

export function resolveLocation(fullPath: string): Location {
  const [pathPart, queryPart] = fullPath.split("?") as [string, string | undefined];
  const path = base && pathPart.startsWith(base) ? pathPart.slice(base.length) || "/" : pathPart;
  const m = match(path);
  const query = Object.fromEntries(new URLSearchParams(queryPart ?? ""));
  return { path, page: m?.page ?? null, params: m?.params ?? {}, query };
}

export function sync() {
  if (typeof window === "undefined") return;
  location.set(resolveLocation(window.location.pathname + window.location.search));
}

export function hrefFor(target: string | PageDef, params: Record<string, unknown> = {}): string {
  const def = typeof target === "string" ? (pages.get(target) ?? null) : target;
  if (!def) return typeof target === "string" && target.startsWith("/") ? base + target : "#";
  const used = new Set<string>();
  const path = def.route.replace(/:(\w+)/g, (_m, k: string) => {
    used.add(k);
    return encodeURIComponent(String(params[k] ?? ""));
  });
  const rest = Object.entries(params).filter(([k]) => !used.has(k));
  const q = rest.length ? `?${new URLSearchParams(rest.map(([k, v]) => [k, String(v)])).toString()}` : "";
  return `${base}${path || "/"}${q}`;
}

export function go(target: string | PageDef, params: Record<string, unknown> = {}) {
  const href = hrefFor(target, params);
  if (typeof window === "undefined") return;
  window.history.pushState(null, "", href);
  sync();
  window.scrollTo(0, 0);
}

export function back() {
  if (typeof window !== "undefined") window.history.back();
}

if (typeof window !== "undefined") window.addEventListener("popstate", sync);

/** Forgets every registered page (a playground starting a fresh run). */
export function reset() {
  pages.clear();
  location.set({ path: "/", page: null, params: {}, query: {} });
}
