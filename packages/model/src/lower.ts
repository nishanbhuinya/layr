/**
 * Lowering: a widget plus its resolved config → CSS classes, declarations and element attributes.
 * Shared by the compiler (static configs become CSS rules at build time) and the runtime
 * (dynamic configs become inline styles), so both paths produce identical results.
 */
import { Color } from "./color.ts";
import { interpolate, num, UNIT } from "./ds.ts";
import type { LayoutKind } from "./schema.ts";
import { runtimeWidget } from "./table.ts";
import {
  alignPoint,
  type Insets,
  insetsCss,
  isInsets,
  isSize,
  type Length,
  lengthCss,
  lengthValue,
  type PerFrame,
  paintCss,
  type Shadow,
  shadowCss,
  toColor,
  toInsets,
} from "./values.ts";

export type Decls = Record<string, string>;

export interface Lowered {
  tag: string;
  classes: string[];
  decls: Decls;
  /** Declarations that only apply under a media condition (from `.at(frame)` and interpolation). */
  media: Array<{ media: string; decls: Decls }>;
  attrs: Record<string, string | boolean | number>;
  /** Declarations for the element's direct children (e.g. Row gap handled by the parent). */
  notes: string[];
}

export interface LowerContext {
  /** Frame name → min-width (from the active DesignScale). */
  frames: ReadonlyMap<string, { from: number; w: number }>;
}

/** Every LAYR element starts from these rules. Emitted once per app. */
const BASE_RULES = `
.l{box-sizing:border-box;margin:0;padding:0;border:0 solid;font:inherit;color:inherit;background:none;text-align:inherit}
.l-box,.l-col,.l-scroll{display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start}
.l-row{display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start}
.l-wrap{display:flex;flex-direction:row;flex-wrap:wrap;align-items:flex-start}
.l-stack{display:grid;grid-template:minmax(0,1fr)/minmax(0,1fr);align-items:start;justify-items:start;position:relative}
.l-pass{display:contents}
.l-fade{mask-image:linear-gradient(to bottom,transparent,#000 var(--l-fa),#000 calc(100% - var(--l-fb)),transparent);animation:l-fade linear both;animation-timeline:scroll(self block)}
.l-fade-x{mask-image:linear-gradient(to right,transparent,#000 var(--l-fa),#000 calc(100% - var(--l-fb)),transparent);animation:l-fade linear both;animation-timeline:scroll(self inline)}
@keyframes l-fade{0%{--l-fa:0px;--l-fb:var(--l-fade)}8%{--l-fa:var(--l-fade)}92%{--l-fb:var(--l-fade)}100%{--l-fa:var(--l-fade);--l-fb:0px}}
.l-stack>*{grid-area:1/1}
.l-grid{display:grid}
.l-scroll{overflow:auto}
.l-text{display:block;overflow-wrap:break-word}
.l-inline{display:inline}
.l-leaf{display:block;flex-shrink:0}
.l-row>.l-wfill,.l-wrap>.l-wfill{flex:var(--l-flex,1) 1 0;min-width:0}
.l-col>.l-hfill,.l-box>.l-hfill,.l-scroll>.l-hfill{flex:var(--l-flex,1) 1 0}
.l-col>.l-wfill,.l-box>.l-wfill,.l-scroll>.l-wfill{width:100%;width:-webkit-fill-available;width:-moz-available;width:stretch}
.l-row>.l-hfill,.l-wrap>.l-hfill{align-self:stretch}
.l-stack>.l-wfill,.l-grid>.l-wfill{justify-self:stretch;width:100%}
.l-stack>.l-hfill,.l-grid>.l-hfill{align-self:stretch;height:100%}
.l-row>.l-wfix,.l-wrap>.l-wfix{flex-shrink:0}
.l-col>.l-hfix,.l-box>.l-hfix{flex-shrink:0}
.l-row>*{flex-shrink:var(--l-shrink,1)}
.l-hide{display:none!important}
.l-row.l-stackable{flex-wrap:wrap}
.l-row.l-stacked{flex-direction:column;align-items:stretch!important}
.l-row.l-adapt>.l-wfill{min-width:min-content}
.l-row.l-adapt.l-stacked>.l-wfill{min-width:0}
.l-row.l-wrap-auto{flex-wrap:wrap}
.l-row.l-stackable>*,.l-row.l-stackable>.l-wfill.l-wfill{flex-grow:var(--l-flex,1);flex-basis:calc((var(--l-stack-at) - 100%) * 999)}
.l-root{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:calc(16 * var(--dsf) / ${UNIT});line-height:1.5}
dialog.l::backdrop{background:var(--l-backdrop,rgb(0 0 0 / .35))}
button.l{cursor:pointer}
button.l:disabled{cursor:not-allowed}
.l:focus-visible{outline:2px solid currentColor;outline-offset:2px}
@media (prefers-reduced-motion: reduce){.l-motion{transition:none!important;animation:none!important}}
`.trim();

/**
 * Parent-to-child layout rules also apply through pass-through wrappers (`.l-pass`: Animate,
 * Focus, and If's presence wrapper render `display: contents`), so wrapping an object never
 * changes how its parent lays it out.
 */
export const BASE_CSS = BASE_RULES.replace(/\.l-(row|col|box|wrap|stack|grid|scroll)>/g, ":is(.l-$1,.l-$1>.l-pass)>");

const AXIS_CSS: Record<string, string> = {
  start: "flex-start",
  mid: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
  stretch: "stretch",
};

const ALIGN_SHORT: Record<string, string> = { t: "top", b: "bottom", l: "Left", r: "Right", m: "mid" };

/** Canonical 2-D alignment from any accepted spelling (`topMid`, `tM`, `lM`, `center`, `mid`). */
export function canonicalAlign(v: string): string | null {
  const direct = ["topLeft", "topMid", "topRight", "midLeft", "mid", "midRight", "bottomLeft", "bottomMid", "bottomRight"];
  if (direct.includes(v)) return v;
  if (v === "center" || v === "centre" || v === "middle") return "mid";
  if (v === "top") return "topMid";
  if (v === "bottom") return "bottomMid";
  if (v === "left") return "midLeft";
  if (v === "right") return "midRight";
  const s = v.toLowerCase();
  if (s.length === 2 && [...s].every((c) => "tblrm".includes(c))) {
    const vert = [...s].find((c) => c === "t" || c === "b");
    const horiz = [...s].find((c) => c === "l" || c === "r");
    if ([...s].filter((c) => c === "t" || c === "b").length > 1 || [...s].filter((c) => c === "l" || c === "r").length > 1) return null;
    const vs = vert ? (ALIGN_SHORT[vert] as string) : "mid";
    const hs = horiz ? (ALIGN_SHORT[horiz] as string) : "Mid";
    if (vs === "mid" && hs === "Mid") return "mid";
    return vs === "mid" ? `mid${hs}` : `${vs}${hs}`;
  }
  return null;
}

function alignFlex(a: string, dir: "row" | "col"): Decls {
  const [x, y] = alignPoint(canonicalAlign(a) ?? "topLeft");
  const pos = (n: number) => (n === 0 ? "flex-start" : n === 1 ? "flex-end" : "center");
  return dir === "col"
    ? { "justify-content": pos(y), "align-items": pos(x) }
    : { "justify-content": pos(x), "align-items": pos(y) };
}

function alignGrid(a: string): Decls {
  const [x, y] = alignPoint(canonicalAlign(a) ?? "topLeft");
  const pos = (n: number) => (n === 0 ? "start" : n === 1 ? "end" : "center");
  return { "justify-items": pos(x), "align-items": pos(y) };
}

function isPerFrame(v: unknown): v is PerFrame<unknown> {
  return typeof v === "object" && v !== null && (v as { $?: string }).$ === "frames";
}

const WEIGHTS: Record<string, string> = { thin: "100", light: "300", regular: "400", medium: "500", semibold: "600", bold: "700", black: "900" };

const TEXT_TYPE_TAG: Record<string, string> = { h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5", h6: "h6", p: "p", label: "label", code: "code", span: "span", strong: "strong", em: "em" };
const TEXT_TYPE_SIZE: Record<string, number> = { h1: 48, h2: 36, h3: 28, h4: 22, h5: 18, h6: 16 };

function radiusCss(v: unknown): string {
  if (isInsets(v)) {
    // only(topLeft: 8, ...) arrives as insets with top=topLeft, right=topRight, bottom=bottomRight, left=bottomLeft
    return [v.top, v.right, v.bottom, v.left].map((x) => lengthCss(x)).join(" ");
  }
  return lengthCss(v as Length);
}

function sizingClass(axis: "w" | "h", v: unknown, classes: string[]) {
  if (v === "fill") classes.push(`l-${axis}fill`);
  else if (v !== undefined && v !== "hug" && !(typeof v === "object" && v !== null && (v as { $: string }).$ === "pct")) classes.push(`l-${axis}fix`);
}

/**
 * Lowers one widget. `cfg` holds canonical keys with runtime values. Per-frame values become
 * media pieces (interpolated for numeric lengths unless marked `step`).
 */
export function lower(name: string, cfg: Readonly<Record<string, unknown>>, ctx?: LowerContext): Lowered {
  const def = runtimeWidget(name);
  const layout: LayoutKind = def?.layout ?? "box";
  const out: Lowered = { tag: def?.tag ?? "div", classes: ["l"], decls: {}, media: [], attrs: {}, notes: [] };
  const d = out.decls;

  const layoutClass: Partial<Record<LayoutKind, string>> = {
    box: "l-box",
    row: "l-row",
    col: "l-col",
    stack: "l-stack",
    wrap: "l-wrap",
    grid: "l-grid",
    scroll: "l-scroll",
    text: "l-text",
    inline: "l-inline",
    leaf: "l-leaf",
  };
  const lc = layoutClass[layout];
  if (lc) out.classes.push(lc);

  // Per-frame values: resolve the base value now, collect media pieces for later.
  const base: Record<string, unknown> = {};
  const perFrame: Array<[string, PerFrame<unknown>]> = [];
  for (const [key, value] of Object.entries(cfg)) {
    if (key === "hide" && isPerFrame(value)) {
      // Visibility per frame is a display switch in media rules (a class could not be undone per frame).
      const all = ctx ? [...ctx.frames.entries()].sort((a, b) => a[1].from - b[1].from) : [];
      const frames = all.filter(([f]) => f in value.values);
      const show = LAYOUT_DISPLAY[layout] ?? "block";
      // The base is the smallest frame's value; a frame nobody set shows the object.
      const smallest = all[0];
      const baseHidden = smallest && smallest[0] in value.values ? value.values[smallest[0]] === true : !ctx && Object.values(value.values)[0] === true;
      d.display = baseHidden ? "none" : show;
      for (const [f, info] of frames) {
        if (f === smallest?.[0]) continue;
        out.media.push({ media: `(min-width: ${num(info.from)}px)`, decls: { display: value.values[f] === true ? "none" : show } });
      }
      continue;
    }
    if (isPerFrame(value)) {
      perFrame.push([key, value]);
      const frames = ctx ? [...ctx.frames.entries()].sort((a, b) => a[1].from - b[1].from) : [];
      const first = frames.find(([f]) => f in value.values);
      base[key] = first ? value.values[first[0]] : Object.values(value.values)[0];
    } else base[key] = value;
  }

  applyKeys(name, layout, base, out);

  if (ctx) {
    for (const [key, pf] of perFrame) {
      const frames = [...ctx.frames.entries()].filter(([f]) => f in pf.values).sort((a, b) => a[1].from - b[1].from);
      const numeric = frames.every(([f]) => typeof pf.values[f] === "number");
      const cssProp = key === "size" && (layout === "text" || layout === "inline") ? "font-size" : LENGTH_PROP[key];
      if (numeric && !pf.step && cssProp && frames.length > 1) {
        const pieces = interpolate(
          frames.map(([f, info]) => ({ at: info.w, value: pf.values[f] as number })),
          key === "size" && layout === "text" ? "font" : "length",
        );
        for (const p of pieces) {
          if (!p.media) d[cssProp] = p.value;
          else out.media.push({ media: p.media, decls: { [cssProp]: p.value } });
        }
      } else {
        for (const [f, info] of frames.slice(1)) {
          const sub: Lowered = { tag: out.tag, classes: [], decls: {}, media: [], attrs: {}, notes: [] };
          applyKeys(name, layout, { [key]: pf.values[f] }, sub);
          out.media.push({ media: `(min-width: ${num(info.from)}px)`, decls: sub.decls });
        }
      }
    }
  }
  return out;
}

/** The display each layout has when shown (matches the base rules). */
const LAYOUT_DISPLAY: Partial<Record<LayoutKind, string>> = { box: "flex", col: "flex", row: "flex", wrap: "flex", scroll: "flex", stack: "grid", grid: "grid", text: "block", inline: "inline" };

const LENGTH_PROP: Record<string, string> = {
  w: "width",
  h: "height",
  minW: "min-width",
  maxW: "max-width",
  minH: "min-height",
  maxH: "max-height",
  gap: "gap",
  letterSpacing: "letter-spacing",
};

function applyKeys(name: string, layout: LayoutKind, cfg: Record<string, unknown>, out: Lowered) {
  const d = out.decls;
  const has = (key: string) => cfg[key] !== undefined && cfg[key] !== null;

  // ---- dimensions
  let w = cfg.w as Length | undefined;
  let h = cfg.h as Length | undefined;
  if (isSize(cfg.size) && layout !== "text") {
    w ??= cfg.size.w;
    h ??= cfg.size.h;
  } else if ((typeof cfg.size === "number" || (typeof cfg.size === "object" && cfg.size !== null)) && layout !== "text" && name !== "Gap" && name !== "Icon") {
    w ??= cfg.size as Length;
    h ??= cfg.size as Length;
  }
  sizingClass("w", w, out.classes);
  sizingClass("h", h, out.classes);
  if (w !== undefined && w !== "fill" && w !== "hug") d.width = lengthCss(w);
  if (h !== undefined && h !== "fill" && h !== "hug") d.height = lengthCss(h);
  if (w === "hug") d.width = "fit-content";
  for (const key of ["minW", "maxW", "minH", "maxH"]) {
    if (has(key)) d[LENGTH_PROP[key] as string] = lengthCss(cfg[key] as Length);
  }
  if (has("aspect")) d["aspect-ratio"] = num(cfg.aspect as number);
  if (has("flex") && cfg.flex !== 1) d["--l-flex"] = num(cfg.flex as number);
  if (has("shrink") && cfg.shrink !== 1) d["--l-shrink"] = num(cfg.shrink as number);

  // ---- common
  if (has("margin")) d.margin = insetsCss(cfg.margin as Insets);
  if (has("opacity")) d.opacity = num(cfg.opacity as number);
  if (cfg.hide === true) out.classes.push("l-hide");
  if (has("cursor")) d.cursor = cfg.cursor === "notAllowed" ? "not-allowed" : String(cfg.cursor);
  if (has("z")) d["z-index"] = String(cfg.z);

  // ---- decoration
  if (has("color") && layout !== "text" && layout !== "inline") {
    const p = paintCss(cfg.color);
    if (p.color) d["background-color"] = p.color;
    if (p.image) d["background-image"] = p.image;
  }
  if (has("padding")) d.padding = insetsCss(cfg.padding as Insets);
  if (has("cornerRadius")) d["border-radius"] = radiusCss(cfg.cornerRadius);
  if (has("borderWidth") || has("borderColor")) {
    const width = lengthCss((cfg.borderWidth as Length | undefined) ?? 1);
    const color = (toColor(cfg.borderColor) ?? new Color(0, 0, 0)).toCss();
    const style = (cfg.borderStyle as string | undefined) ?? "solid";
    const align = (cfg.borderAlign as string | undefined) ?? "in";
    const sides = (cfg.borderSides as string | undefined) ?? "all";
    if (sides !== "all") {
      // One or two sides (inside the box): hairlines between regions, underlined headers.
      const list = sides === "x" ? ["left", "right"] : sides === "y" ? ["top", "bottom"] : [sides];
      for (const s of list) d[`border-${s}`] = `${width} ${style} ${color}`;
    } else if (align === "in") {
      d.border = `${width} ${style} ${color}`;
    } else {
      // out/mid: draw with outline so the box size is unchanged; mid straddles the edge.
      d.outline = `${width} ${style} ${color}`;
      d["outline-offset"] = align === "out" ? "0px" : `calc(${width} / -2)`;
    }
  }
  if (has("shadow")) d["box-shadow"] = shadowCss(cfg.shadow as Shadow);
  // `clip`, not `hidden`: clipping must not create a scroll container (sticky descendants keep working).
  if (cfg.clip === true) d.overflow = "clip";

  // ---- layout-specific
  switch (layout) {
    case "box": {
      if (name === "Mid") {
        out.classes.push("l-wfill", "l-hfill");
        d["justify-content"] = "center";
        d["align-items"] = "center";
        d["align-self"] = "stretch";
        d.flex = "1 1 auto";
      } else if (name === "Align") {
        out.classes.push("l-wfill", "l-hfill");
        d["align-self"] = "stretch";
        d.flex = "1 1 auto";
        Object.assign(d, alignFlex((cfg.to as string) ?? "mid", "col"));
      } else if (has("objAlign")) Object.assign(d, alignFlex(cfg.objAlign as string, "col"));
      if (name === "Aspect" && has("ratio")) d["aspect-ratio"] = num(cfg.ratio as number);
      if (name === "SafeArea") d.padding = "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
      if (name === "Clip") {
        d.overflow = "hidden";
        if (cfg.shape === "circle") d["clip-path"] = "circle(50%)";
        else if (cfg.shape === "ellipse") d["clip-path"] = "ellipse(50% 50%)";
      }
      if (name === "Blur") {
        const v = lengthCss((cfg.value as Length | undefined) ?? 12);
        if (cfg.blurOn === "object") d.filter = `blur(${v})`;
        else {
          d["backdrop-filter"] = `blur(${v})`;
          d["-webkit-backdrop-filter"] = `blur(${v})`;
        }
      }
      break;
    }
    case "row":
    case "col":
    case "wrap": {
      const dir = layout === "col" ? "col" : "row";
      if (layout === "row" && cfg.reverse === true) d["flex-direction"] = "row-reverse";
      if (layout === "col" && cfg.reverse === true) d["flex-direction"] = "column-reverse";
      const main = dir === "row" ? "xAlign" : "yAlign";
      const cross = dir === "row" ? "yAlign" : "xAlign";
      if (has(main)) d["justify-content"] = AXIS_CSS[cfg[main] as string] ?? "flex-start";
      if (has(cross)) d["align-items"] = AXIS_CSS[cfg[cross] as string] ?? "flex-start";
      if (has("gap")) d.gap = lengthCss(cfg.gap as Length);
      if (layout === "wrap" && has("runGap")) d["row-gap"] = lengthCss(cfg.runGap as Length);
      if (name === "Scaffold") {
        d["min-height"] = "100dvh";
        d.width = "100%";
        d["align-items"] = "stretch";
        if (cfg.scroll === "none") {
          d.height = "100dvh";
          d.overflow = "hidden";
        }
        if (has("color")) {
          const p = paintCss(cfg.color);
          if (p.color) d["background-color"] = p.color;
          if (p.image) d["background-image"] = p.image;
        }
      }
      const overflow = (cfg.overflow as string | undefined) ?? "auto";
      if (layout === "row") {
        if (overflow === "wrap") d["flex-wrap"] = "wrap";
        else if (overflow === "stack") {
          out.classes.push("l-stackable");
          d["--l-stack-at"] = has("stackAt") ? lengthCss(cfg.stackAt as Length) : "99999px";
        } else if (overflow === "scroll") d["overflow-x"] = "auto";
        else if (overflow === "clip") d.overflow = "clip";
        else if (overflow === "auto") {
          if (has("stackAt")) {
            // An explicit threshold is the whole rule: pure CSS, no runtime measurement.
            out.classes.push("l-stackable");
            d["--l-stack-at"] = lengthCss(cfg.stackAt as Length);
          } else {
            // The adaptation (wrap vs stack) depends on the children's sizing; the compiler/runtime adds it.
            out.notes.push("adapt-row");
          }
        }
      } else if (layout === "col") {
        if (overflow === "scroll" || (overflow === "auto" && (cfg.h !== undefined && cfg.h !== "hug"))) d["overflow-y"] = "auto";
        else if (overflow === "clip") d.overflow = "clip";
      }
      break;
    }
    case "stack":
      if (has("objAlign")) Object.assign(d, alignGrid(cfg.objAlign as string));
      if (name === "Mask" || name === "Subtract") d.isolation = "isolate";
      break;
    case "grid": {
      if (has("cols")) d["grid-template-columns"] = `repeat(${cfg.cols}, minmax(0, 1fr))`;
      else d["grid-template-columns"] = `repeat(auto-fill, minmax(min(100%, ${lengthCss((cfg.minItemW as Length | undefined) ?? 240)}), 1fr))`;
      if (has("gap")) d.gap = lengthCss(cfg.gap as Length);
      if (has("rowGap")) d["row-gap"] = lengthCss(cfg.rowGap as Length);
      break;
    }
    case "scroll": {
      const axis = (cfg.axis as string | undefined) ?? "y";
      d.overflow = "hidden";
      if (axis === "x" || axis === "both") d["overflow-x"] = "auto";
      if (axis === "y" || axis === "both") d["overflow-y"] = "auto";
      if (axis === "x") d["flex-direction"] = "row";
      if (cfg.bar === "hide") d["scrollbar-width"] = "none";
      if (has("fade")) {
        // Content fades at whichever edge can still scroll (scroll-driven; none where unsupported).
        out.classes.push(axis === "x" ? "l-fade-x" : "l-fade");
        d["--l-fade"] = lengthCss(cfg.fade as Length);
      }
      if (has("snap") && cfg.snap !== "none") {
        d["scroll-snap-type"] = `${axis === "both" ? "both" : axis} mandatory`;
      }
      break;
    }
    case "text":
    case "inline": {
      const type = cfg.type as string | undefined;
      if (layout === "text") out.tag = type ? (TEXT_TYPE_TAG[type] ?? "p") : "p";
      const defaultSize = type ? TEXT_TYPE_SIZE[type] : undefined;
      const size = (cfg.size as Length | undefined) ?? defaultSize;
      if (size !== undefined) d["font-size"] = typeof size === "number" ? lengthCss(size, true) : lengthCss(size);
      if (type && TEXT_TYPE_SIZE[type] && !has("weight")) d["font-weight"] = "700";
      if (type === "code") d["font-family"] = "var(--layr-font-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)";
      if (has("font")) d["font-family"] = fontFamily(cfg.font as string);
      if (has("weight")) d["font-weight"] = WEIGHTS[String(cfg.weight)] ?? String(cfg.weight);
      if (cfg.italic === true) d["font-style"] = "italic";
      if (has("color")) {
        const p = paintCss(cfg.color);
        if (p.color) d.color = p.color;
        if (p.image) {
          d["background-image"] = p.image;
          d["-webkit-background-clip"] = "text";
          d["background-clip"] = "text";
          d.color = "transparent";
        }
      }
      if (has("align")) d["text-align"] = cfg.align === "mid" ? "center" : String(cfg.align);
      if (has("lineHeight")) d["line-height"] = num(cfg.lineHeight as number);
      if (has("letterSpacing")) d["letter-spacing"] = lengthCss(cfg.letterSpacing as Length);
      const deco = [cfg.underline === true ? "underline" : "", cfg.strike === true ? "line-through" : ""].filter(Boolean).join(" ");
      if (deco) d["text-decoration-line"] = deco;
      if (cfg.underline === true && cfg.underlineSkipInk === false) d["text-decoration-skip-ink"] = "none";
      if (has("underlinePos")) d["text-underline-position"] = cfg.underlinePos === "baseline" ? "auto" : String(cfg.underlinePos);
      if (has("transform")) d["text-transform"] = cfg.transform === "upper" ? "uppercase" : cfg.transform === "lower" ? "lowercase" : String(cfg.transform);
      if (cfg.selectable === false) d["user-select"] = "none";
      if (has("baseline")) d["vertical-align"] = cfg.baseline === "mid" ? "middle" : String(cfg.baseline);
      const overflow = cfg.overflow as string | undefined;
      const lines = cfg.maxLines as number | undefined;
      if (overflow === "ellipsis" || lines) {
        if (!lines || lines === 1) {
          d["white-space"] = "nowrap";
          d.overflow = "hidden";
          d["text-overflow"] = "ellipsis";
        } else {
          d.display = "-webkit-box";
          d["-webkit-box-orient"] = "vertical";
          d["-webkit-line-clamp"] = String(lines);
          d.overflow = "hidden";
        }
      } else if (overflow === "clip") d.overflow = "clip";
      else if (overflow === "fade") {
        d["white-space"] = "nowrap";
        d.overflow = "hidden";
        d["mask-image"] = "linear-gradient(to right, #000 80%, transparent)";
      }
      break;
    }
    case "leaf": {
      if (name === "Gap") {
        const s = cfg.size as Length | undefined;
        d["flex-basis"] = lengthCss(s ?? 0);
        d["flex-shrink"] = "0";
        d.width = lengthCss(s ?? 0);
        d.height = lengthCss(s ?? 0);
        out.notes.push("gap");
      }
      if (name === "Image" || name === "Video") {
        if (has("fit")) d["object-fit"] = cfg.fit === "scaleDown" ? "scale-down" : String(cfg.fit);
        else d["object-fit"] = name === "Image" ? "cover" : "contain";
        if (has("position")) {
          const [x, y] = alignPoint(canonicalAlign(String(cfg.position)) ?? "mid");
          d["object-position"] = `${num(x * 100)}% ${num(y * 100)}%`;
        }
        d["max-width"] ??= "100%";
      }
      if (name === "Icon") {
        const s = (cfg.size as Length | undefined) ?? 24;
        d.width = lengthCss(s);
        d.height = lengthCss(s);
        d["font-size"] = lengthCss(s);
        d["line-height"] = "1";
        d.display = "inline-flex";
        if (has("color")) d.color = (toColor(cfg.color) ?? new Color(0, 0, 0)).toCss();
      }
      if (name === "Svg" && has("color")) d.color = (toColor(cfg.color) ?? new Color(0, 0, 0)).toCss();
      break;
    }
    case "passthrough": {
      if (name === "Position") {
        const edges = ["top", "right", "bottom", "left"].filter((e) => has(e));
        if (cfg.sticky === true) {
          // Sticks at the given edges while its scroll container scrolls (top: 0 by default).
          d.position = "sticky";
          for (const e of edges.length ? edges : ["top"]) d[e] = lengthCss((cfg[e] as Length) ?? 0);
        } else if (edges.length) {
          d.position = "absolute";
          for (const e of edges) d[e] = lengthCss(cfg[e] as Length);
        } else d.position = "relative";
        if (has("x") || has("y")) d.translate = `${lengthCss((cfg.x as Length) ?? 0)} ${lengthCss((cfg.y as Length) ?? 0)}`;
      }
      if (name === "Order") d["z-index"] = String(cfg.pos ?? 0);
      if (name === "Expand") {
        out.classes.push("l-wfill");
        if (has("flex")) d["--l-flex"] = num(cfg.flex as number);
      }
      if (name === "Filter") {
        const f: string[] = [];
        if (has("grayscale")) f.push(`grayscale(${num(cfg.grayscale as number)})`);
        if (has("blur")) f.push(`blur(${lengthCss(cfg.blur as Length)})`);
        for (const key of ["brightness", "contrast", "saturate", "invert", "sepia"]) if (has(key)) f.push(`${key}(${num(cfg[key] as number)})`);
        if (has("hueRotate")) f.push(`hue-rotate(${num(cfg.hueRotate as number)}deg)`);
        if (f.length) d.filter = f.join(" ");
        if (has("blend")) d["mix-blend-mode"] = String(cfg.blend);
      }
      break;
    }
  }

  // Attributes
  if (name === "Button") {
    out.attrs.type = cfg.submit === true ? "submit" : "button";
    if (cfg.disabled === true) out.attrs.disabled = true;
  }
  if (name === "Image" || name === "Svg") {
    if (typeof cfg.src === "string") out.attrs.src = cfg.src;
    if (cfg.decorative === true) {
      out.attrs.alt = "";
      out.attrs["aria-hidden"] = true;
    } else if (typeof cfg.alt === "string") out.attrs.alt = cfg.alt;
    if (name === "Image" && cfg.lazy !== false) out.attrs.loading = "lazy";
    out.attrs.decoding = "async";
  }
  if (name === "Link") {
    if (has("underline")) d["text-decoration-line"] = cfg.underline === false ? "none" : "underline";
    if (typeof cfg.href === "string") out.attrs.href = cfg.href;
    if (cfg.external === true) {
      out.attrs.target = "_blank";
      out.attrs.rel = "noopener noreferrer";
    }
  }
}

function fontFamily(f: string): string {
  const generic = ["serif", "sans-serif", "monospace", "cursive", "system-ui", "ui-monospace", "ui-sans-serif", "ui-serif"];
  if (f.startsWith("var(")) return f;
  return generic.includes(f) ? f : `"${f}", system-ui, sans-serif`;
}

/** Declarations → CSS text. */
export function declsCss(decls: Decls): string {
  return Object.entries(decls)
    .map(([p, v]) => `${p}:${v}`)
    .join(";");
}

export function lengthOf(v: Length): number {
  return lengthValue(v);
}

export { toInsets };
