/**
 * The app shell: Design Scale root, router outlet, providers, and mounting (hydrate when the page
 * was prerendered).
 */
import { DEFAULT_DESIGN_SCALE, type DesignScaleConfig } from "@layr-internal/model";
import { configureFrames, router } from "@layr-internal/runtime";
import { type ComponentType, createElement, type ReactNode, StrictMode, useEffect, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { useTrack } from "./track.ts";

export interface AppConfig {
  scale?: DesignScaleConfig;
  /** Components wrapping the whole app, outermost first (e.g. a QueryClientProvider). */
  providers?: Array<{ component: ComponentType<{ children?: ReactNode }>; props?: Record<string, unknown> }>;
  notFound?: ComponentType;
  base?: string;
  title?: string;
}

/** The current route's params and query (tracked). */
export function useRoute(): Record<string, string> & { $path: string } {
  const loc = router.location.get();
  return { ...loc.query, ...loc.params, $path: loc.path };
}

const loaded = new Map<string, unknown>();
let seeded = false;
/** The last data each page rendered with: shown while the next route's data loads (no blank flash). */
const lastByPage = new Map<string, unknown>();

function Outlet({ notFound, initialData }: { notFound?: ComponentType; initialData?: unknown }): ReactNode {
  const t = useTrack();
  try {
    const loc = router.location.get();
    const page = loc.page;
    const [, force] = useState(0);
    const key = loc.path;
    // Prerendered data belongs to the first URL only; later navigations load their own.
    const server = typeof window === "undefined";
    if (!server && !seeded) {
      seeded = true;
      if (initialData !== undefined) loaded.set(key, initialData);
    }
    const data = server ? initialData : loaded.has(key) ? loaded.get(key) : page ? lastByPage.get(page.name) : undefined;
    if (!server && page && loaded.has(key)) lastByPage.set(page.name, data);
    const title = router.metaFor(page, loc.params, data).title;
    useEffect(() => {
      if (typeof title === "string" && typeof document !== "undefined") document.title = title;
    }, [title]);
    useEffect(() => {
      if (!page?.load || loaded.has(key)) return;
      let alive = true;
      page.load({ ...loc.query, ...loc.params }).then((data) => {
        loaded.set(key, data);
        if (alive) force((n) => n + 1);
      });
      return () => {
        alive = false;
      };
    }, [key, page]);
    if (!page) return notFound ? createElement(notFound) : createElement("main", { className: "l l-col", style: { padding: "2rem" } }, "Page not found.");
    return createElement(page.component as ComponentType<Record<string, unknown>>, { $data: data, key: page.name });
  } finally {
    t.done();
  }
}

/** Root element: carries the Design Scale variables (`.l-root`). */
export function LayrRoot({ children, className }: { children?: ReactNode; className?: string }): ReactNode {
  return createElement("div", { className: `l-root${className ? ` ${className}` : ""}`, "data-layr": "" }, children);
}

export function LayrApp({ config = {}, initialData }: { config?: AppConfig; initialData?: unknown }): ReactNode {
  configureFrames(config.scale ?? DEFAULT_DESIGN_SCALE);
  let tree: ReactNode = createElement(Outlet, { notFound: config.notFound, initialData });
  for (const p of [...(config.providers ?? [])].reverse()) tree = createElement(p.component, p.props ?? {}, tree);
  return createElement(LayrRoot, null, tree);
}

/** For embedding LAYR widgets inside an existing React app. */
export function LayrProvider({ children, scale }: { children?: ReactNode; scale?: DesignScaleConfig }): ReactNode {
  configureFrames(scale ?? DEFAULT_DESIGN_SCALE);
  return createElement(LayrRoot, null, children);
}

/** Client entry: hydrates prerendered HTML or renders fresh. */
export function mount(el: HTMLElement, config: AppConfig = {}) {
  if (config.base) router.setBase(config.base);
  router.sync();
  const data = (window as { __LAYR_DATA__?: unknown }).__LAYR_DATA__;
  const app = createElement(StrictMode, null, createElement(LayrApp, { config, initialData: data }));
  if (el.hasChildNodes()) hydrateRoot(el, app);
  else createRoot(el).render(app);
}
