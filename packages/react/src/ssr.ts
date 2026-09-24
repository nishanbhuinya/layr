/** Server rendering for `layr build` (static prerender). */
import { router } from "@layr-internal/runtime";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { type AppConfig, LayrApp } from "./app.tsx";

export interface Rendered {
  html: string;
  title: string | null;
  meta: Record<string, unknown>;
  status: number;
}

/** Static routes (no `:params`) to prerender. */
export function routes(): string[] {
  return router
    .allPages()
    .map((p) => p.route)
    .filter((r) => !r.includes(":") && !r.includes("*"));
}

/** Every route to prerender: static routes plus each dynamic route expanded by its page's `.paths`. */
export async function prerenderRoutes(): Promise<string[]> {
  const out = routes();
  for (const p of router.allPages()) {
    if (!p.route.includes(":") || !p.paths) continue;
    for (const params of await p.paths()) out.push(router.hrefFor(p, params).replace(/\?.*$/, ""));
  }
  return [...new Set(out)];
}

/** Runs the matched page's `.load` for a URL (prerendering embeds the result for hydration). */
export async function loadData(url: string): Promise<unknown> {
  const loc = router.resolveLocation(url);
  if (!loc.page?.load) return undefined;
  return loc.page.load({ ...loc.query, ...loc.params });
}

export function renderPage(url: string, config: AppConfig = {}, data?: unknown): Rendered {
  const loc = router.resolveLocation(url);
  router.location.set(loc);
  const html = renderToString(createElement(LayrApp, { config, initialData: data }));
  const meta = router.metaFor(loc.page, loc.params, data);
  const title = typeof meta.title === "string" ? meta.title : (config.title ?? null);
  return { html, title, meta, status: loc.page ? 200 : 404 };
}
