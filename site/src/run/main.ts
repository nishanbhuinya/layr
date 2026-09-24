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

const MODULES: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "@dynshift/layr/react": layrReact,
  "@dynshift/layr/runtime": layrRuntime,
  "@dynshift/layr": { ...layrRuntime, ...layrReact },
};

function post(msg: unknown) {
  parent.postMessage(msg, location.origin);
}

/** Turns `import … from "x"` into lookups in MODULES (the frame has no module graph of its own). */
function link(js: string): string {
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
    .replace(/^export\s+(const|function|let|class)\s/gm, "$1 ");
}

function $require(spec: string): unknown {
  const m = MODULES[spec];
  if (!m) throw new Error(`The playground runs LAYR and React only; \`${spec}\` is not available here. Install it in a project instead.`);
  return m;
}

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
  if (e.data?.type !== "run") return;
  const { js, css, theme } = e.data as { js: string; css: string; theme?: string };
  if (theme) document.documentElement.setAttribute("data-theme", theme);
  else document.documentElement.removeAttribute("data-theme");
  try {
    run(js, css);
    setAuto(autoHeight);
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
});
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
