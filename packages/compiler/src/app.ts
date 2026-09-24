/**
 * `App(...)` and project-level configuration: the Design Scale frames must be known before any
 * `.layr` file compiles (they drive `.at(frame)` and interpolation), so they are read from
 * `app.layr` first by constant evaluation.
 */
import { DEFAULT_DESIGN_SCALE, type DesignScaleConfig, type Frame } from "@layr-internal/model";
import type { Call, Expr, Item } from "./ast.ts";
import { parse } from "./parser.ts";
import { exprItems, firstModifier, identName } from "./project.ts";
import type { Diagnostic } from "./source.ts";

const PRESET_FRAMES: Record<string, Frame> = Object.fromEntries(DEFAULT_DESIGN_SCALE.frames.map((f) => [f.name, f]));

function num(e: Expr | undefined): number | null {
  if (!e) return null;
  if (e.type === "Number") return e.value;
  if (e.type === "Unary" && e.op === "-" && e.argument.type === "Number") return -e.argument.value;
  if (e.type === "Binary" && (e.op === "/" || e.op === "*")) {
    const a = num(e.left);
    const b = num(e.right);
    if (a === null || b === null) return null;
    return e.op === "/" ? a / b : a * b;
  }
  return null;
}

function props(items: Item[] | null): Map<string, Expr> {
  return new Map((items ?? []).filter((i) => i.type === "Prop").map((p) => [(p as { key: string }).key, (p as { value: Expr }).value] as const));
}

/** Evaluates `DesignScale(.m(w: 390, h: 844) .w(w: 1440, h: 900) .frame(name, w:, h:, from:) .config(min: .9, max: 1.15))`. */
export function designScaleFrom(call: Call, diagnostics: Diagnostic[], file?: string): DesignScaleConfig {
  const frames: Frame[] = [];
  let scale = { ...DEFAULT_DESIGN_SCALE.scale };
  let font = { ...DEFAULT_DESIGN_SCALE.font };
  for (const it of call.items) {
    if (it.type !== "Modifier" || it.name === "obj" || it.name === "id") continue;
    const p = props(it.items);
    if (it.name === "config") {
      scale = { lo: num(p.get("min")) ?? scale.lo, hi: num(p.get("max")) ?? scale.hi };
      font = { ...font, lo: num(p.get("fontMin")) ?? font.lo, hi: num(p.get("fontMax")) ?? font.hi, alpha: num(p.get("fontRem")) ?? font.alpha };
      continue;
    }
    const preset = PRESET_FRAMES[it.name];
    const name = it.name === "frame" ? identName(exprItems(it.items)[0]) : it.name;
    if (!name) {
      diagnostics.push({ code: "L4001", severity: "error", message: "`.frame(name, w:, h:, from:)` needs a name.", span: it.span, file });
      continue;
    }
    const base = preset ?? PRESET_FRAMES[name];
    const w = num(p.get("w")) ?? base?.w;
    const h = num(p.get("h")) ?? base?.h;
    const from = num(p.get("from")) ?? base?.from;
    if (w === undefined || h === undefined || from === undefined) {
      diagnostics.push({ code: "L4001", severity: "error", message: `Frame \`${name}\` needs w, h and from.`, span: it.span, file });
      continue;
    }
    const handheld = p.has("handheld") ? identName(p.get("handheld")) === "true" : (base?.handheld ?? w < 1024);
    frames.push({ name, w, h, from, handheld });
  }
  const sorted = frames.sort((a, b) => a.from - b.from);
  if (sorted.length && sorted[0]?.from !== 0) (sorted[0] as Frame).from = 0;
  return { frames: sorted.length ? sorted : [...DEFAULT_DESIGN_SCALE.frames], scale, font };
}

export interface ThemeConfig {
  colors: Record<string, string>;
  /** Colour overrides for dark mode (`.dark(ink: #fdfdfd)`); unlisted colours keep their value. */
  dark: Record<string, string>;
  fonts: Record<string, string>;
}

function themeFrom(call: Call): ThemeConfig {
  const theme: ThemeConfig = { colors: {}, dark: {}, fonts: {} };
  for (const it of call.items) {
    if (it.type !== "Modifier") continue;
    for (const [k, v] of props(it.items)) {
      if (it.name === "colors" && v.type === "Color") theme.colors[k] = `#${v.hex}`;
      if (it.name === "dark" && v.type === "Color") theme.dark[k] = `#${v.hex}`;
      if (it.name === "font" && v.type === "String") theme.fonts[k] = v.parts.join("");
    }
  }
  return theme;
}

/** Reads the Design Scale and Theme from `app.layr` source (or returns defaults). */
export function readAppConfig(appSource: string | null, file = "src/app.layr"): { designScale: DesignScaleConfig; theme: ThemeConfig; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  let designScale: DesignScaleConfig = DEFAULT_DESIGN_SCALE;
  let theme: ThemeConfig = { colors: {}, dark: {}, fonts: {} };
  if (!appSource) return { designScale, theme, diagnostics };
  const { file: ast } = parse(appSource);
  for (const item of ast.items) {
    if (item.type !== "ExprItem" || item.expr.type !== "Call") continue;
    const c = item.expr;
    const name = identName(c.callee);
    if (name === "DesignScale") designScale = designScaleFrom(c, diagnostics, file);
    if (name === "Theme") theme = themeFrom(c);
    if (name === "App") {
      const ds = exprItems(firstModifier(c.items, "scale")?.items ?? null)[0];
      if (ds?.type === "Call" && identName(ds.callee) === "DesignScale") designScale = designScaleFrom(ds, diagnostics, file);
      const th = exprItems(firstModifier(c.items, "theme")?.items ?? null)[0];
      if (th?.type === "Call" && identName(th.callee) === "Theme") theme = themeFrom(th);
    }
  }
  return { designScale, theme, diagnostics };
}
