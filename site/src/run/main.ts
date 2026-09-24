/**
 * The runner frame (/run.html): executes LAYR modules compiled in the parent page (playground,
 * docs previews, widget pages) with the real runtime, in a real viewport. Protocol:
 *   parent → frame  { type: "run", js, css, theme }
 *   frame → parent  { type: "ready" } | { type: "ran", pages } | { type: "error", message }
 */
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import * as layrReact from "@dynshift/layr/react";
import * as layrRuntime from "@dynshift/layr/runtime";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { createRoot, type Root } from "react-dom/client";
import * as googleFonts from "../../../addons/google_fonts/src/index.js";

const MODULES: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "@dynshift/layr/react": layrReact,
  "@dynshift/layr/runtime": layrRuntime,
  "@dynshift/layr": { ...layrRuntime, ...layrReact },
  // Official addons written in JavaScript (LAYR addons arrive as compiled modules with each run).
  "@dynshift/layr-google-fonts": googleFonts,
};

function post(msg: unknown) {
  parent.postMessage(msg, location.origin);
}

/**
 * Turns `import … from "x"` into lookups through $require (the frame has no module graph of its
 * own), and `export`ed declarations into plain ones, recording their names in `exported`.
 */
function link(js: string, exported: string[] = []): string {
  let n = 0;
  return js
    .replace(/^import\s+(?:([\w$]+)\s*,\s*)?(?:\*\s+as\s+([\w$]+)|\{([^}]*)\})?\s*from\s*("[^"]+"|'[^']+');?$/gm, (_m, def: string | undefined, ns: string | undefined, named: string | undefined, spec: string) => {
      const v = `$m${n++}`;
      const out = [`const ${v} = $require(${spec});`];
      if (def) out.push(`const ${def} = ${v}.default ?? ${v};`);
      if (ns) out.push(`const ${ns} = ${v};`);
      if (named) out.push(`const { ${named.replace(/\bas\b/g, ":")} } = ${v};`);
      return out.join(" ");
    })
    .replace(/^import\s+([\w$]+)\s+from\s*("[^"]+"|'[^']+');?$/gm, (_m, def: string, spec: string) => `const ${def} = ($require(${spec}).default ?? $require(${spec}));`)
    .replace(/^import\s+("[^"]+"|'[^']+');?$/gm, (_m, spec: string) => `$require(${spec});`)
    .replace(/^export default\s+[^;]+;?$/gm, "")
    .replace(/^export\s+(const|function|let|class)\s+([\w$]+)/gm, (_m, kw: string, name: string) => {
      exported.push(name);
      return `${kw} ${name}`;
    });
}

/** Modules the page imports besides LAYR and React (installed addons), by project path. */
let sources = new Map<string, string>();
let aliases: Record<string, string> = {};
const loaded = new Map<string, unknown>();

/** Resolves `spec` as imported from the module at `from` (a project path, or the page). */
function resolveSpec(spec: string, from: string): string {
  if (aliases[spec]) return aliases[spec] as string;
  if (!spec.startsWith(".")) return spec;
  const parts = from.split("/").slice(0, -1);
  for (const seg of spec.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

function requireFrom(from: string) {
  return (spec: string): unknown => {
    if (MODULES[spec]) return MODULES[spec];
    const path = resolveSpec(spec, from);
    if (loaded.has(path)) return loaded.get(path);
    const js = sources.get(path);
    if (js === undefined) throw new Error(`The playground runs LAYR, React and the official addons; \`${spec}\` is not available here. Install it in a project instead.`);
    const names: string[] = [];
    const body = `${link(js, names)}\n;return { ${names.join(", ")} };`;
    const exports = {};
    loaded.set(path, exports);
    Object.assign(exports, new Function("$require", body)(requireFrom(path)));
    return exports;
  };
}
const $require = requireFrom("src/pages/index.layr");

let root: Root | null = null;
let style: HTMLStyleElement | null = null;

function run(js: string, css: string) {
  root?.unmount();
  root = null;
  document.body.innerHTML = '<div id="app"></div>';
  style?.remove();
  style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  const { router, registry } = layrRuntime;
  // Each run starts from a clean page table and cascade.
  router.reset();
  registry.reset();
  loaded.clear();
  const app: { $app?: Record<string, unknown> } = {};
  const body = `${link(js)}\n;return typeof $app !== "undefined" ? { $app } : {};`;
  Object.assign(app, new Function("$require", body)($require) as object);
  const pages = router.allPages();
  const page = pages.find((p) => p.route === "/") ?? pages[0];
  if (!page) throw new Error("Nothing to show: add a Page(...) to see it rendered.");
  router.location.set({ path: page.route, page, params: {}, query: {} });
  root = createRoot(document.getElementById("app") as HTMLElement);
  root.render(React.createElement(layrReact.LayrApp, { config: { ...(app.$app ?? {}) } }));
  post({ type: "ran", pages: pages.map((p) => p.name) });
}

addEventListener("message", (e: MessageEvent) => {
  if (e.origin !== location.origin) return;
  if (e.data?.type === "height") return setAuto(!!e.data.auto);
  if (e.data?.type === "theme") {
    if (e.data.theme) document.documentElement.setAttribute("data-theme", e.data.theme);
    else document.documentElement.removeAttribute("data-theme");
    return;
  }
  if (e.data?.type !== "run") return;
  const { js, css, theme, modules, aliases: al } = e.data as { js: string; css: string; theme?: string; modules?: Array<{ path: string; js: string }>; aliases?: Record<string, string> };
  sources = new Map((modules ?? []).map((m) => [m.path, m.js]));
  aliases = al ?? {};
  if (theme) document.documentElement.setAttribute("data-theme", theme);
  else document.documentElement.removeAttribute("data-theme");
  // A transparent run shows the parent's canvas through the page (its colour scheme must match the
  // parent's, or the browser paints an opaque backdrop behind the frame).
  const see = !!(e.data as { transparent?: boolean }).transparent;
  document.documentElement.style.background = see ? "transparent" : "";
  document.documentElement.style.colorScheme = see ? (theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) : "";
  try {
    run(js, css);
    setAuto(autoHeight);
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
});
// A link the example itself does not handle (its router handles in-app routes) must not navigate
// this frame: a page loaded here would be the site inside its own preview. It opens in a new tab.
addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0) return;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || a.getAttribute("href")?.startsWith("#")) return;
  e.preventDefault();
  window.open(a.href, "_blank", "noopener,noreferrer");
});
addEventListener("submit", (e) => e.preventDefault());
addEventListener("error", (e) => post({ type: "error", message: e.message }));
addEventListener("unhandledrejection", (e) => post({ type: "error", message: String(e.reason?.message ?? e.reason) }));
/**
 * Content height for previews that grow with what they show. In `auto` mode the page is measured at
 * its natural height (Scaffold's full-screen minimum lifted), so the frame's own height never feeds
 * back into it; a height the reader picks by dragging is a real viewport and fills normally.
 */
const natural = document.createElement("style");
natural.textContent = "[data-l=Scaffold]{min-height:0!important}";
let autoHeight = true;
const measure = () => {
  const root = document.querySelector(".l-root");
  post({ type: "size", h: Math.ceil(root ? root.getBoundingClientRect().height : document.documentElement.scrollHeight) });
};
const ro = new ResizeObserver(() => requestAnimationFrame(measure));
ro.observe(document.body);
function setAuto(on: boolean) {
  autoHeight = on;
  if (on) document.head.appendChild(natural);
  else natural.remove();
  const root = document.querySelector(".l-root");
  if (root) ro.observe(root);
  requestAnimationFrame(measure);
}
setAuto(true);
post({ type: "ready" });
