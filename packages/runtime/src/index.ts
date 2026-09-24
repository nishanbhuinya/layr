/**
 * `@dynshift/layr/runtime`: the React-free LAYR runtime and value helpers (the `$V` namespace in
 * compiled code).
 */
import { Color, gradient as makeGradient, type Gradient, type GradientKind, isInsets, isLengthObj, isSize, type Length, lengthCss, lengthValue } from "@layr-internal/model";
import { isSource } from "./signals.ts";

export {
  all,
  arith,
  border,
  Color,
  ds,
  ease,
  fr,
  gradient,
  gradientCss,
  lower,
  namedColor,
  only,
  pct,
  px,
  shadow,
  size,
  spring,
  sym,
  vp,
} from "@layr-internal/model";
export type { Border, Gradient, Insets, Length, Shadow, Size } from "@layr-internal/model";
export * from "./actions.ts";
export { atFrame, configureFrames, currentFrame, frame, frames } from "./frames.ts";
export * as registry from "./registry.ts";
export type { CascadeStep, Layer } from "./registry.ts";
export * as router from "./router.ts";
export { batch, Computed, computed, effect, isSource, Observer, Signal, signal, swapTracker, type Tracker, untracked, withTracker } from "./signals.ts";

export function rgb(r: number, g: number, b: number, a = 1): Color {
  return new Color(r, g, b, a);
}

export function hsl(h: number, s: number | { $: "pct"; v: number }, l: number | { $: "pct"; v: number }, a = 1): Color {
  const sv = typeof s === "object" ? s.v / 100 : s > 1 ? s / 100 : s;
  const lv = typeof l === "object" ? l.v / 100 : l > 1 ? l / 100 : l;
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => lv - sv * Math.min(lv, 1 - lv) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return new Color(f(0) * 255, f(8) * 255, f(4) * 255, a);
}

export function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Text for interpolation: sizes, insets and colours print readably. */
export function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (isSource(v)) return str(v.get());
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  if (v instanceof Color) return v.toCss();
  if (isSize(v)) return `(${str(lengthValue(v.w as Length))}, ${str(lengthValue(v.h as Length))})`;
  if (isLengthObj(v)) {
    if (v.$ === "calc") return lengthCss(v);
    return `${str(v.v)}${v.$ === "pct" ? "%" : v.$ === "ds" ? "" : v.$ === "vp" ? v.u : v.$}`;
  }
  if (isInsets(v)) return `(${[v.top, v.right, v.bottom, v.left].map((x) => str(lengthValue(x))).join(", ")})`;
  return String(v);
}

/** `x!`: asserts presence. */
export function must<T>(v: T | null | undefined): T {
  if (v === null || v === undefined) throw new Error("LAYR: a required value (`!`) was empty.");
  return v;
}

/** Structural equality for LAYR values. */
export function eq(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Color && b instanceof Color) return a.equals(b);
  if (typeof a === "object" && typeof b === "object" && a && b) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => eq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

export const motion = {
  fade: { $: "motion", kind: "fade" } as const,
  scale: (from = 0.95) => ({ $: "motion", kind: "scale", from }) as const,
  slide: (o: { x?: number; y?: number } = {}) => ({ $: "motion", kind: "slide", x: o.x ?? 0, y: o.y ?? 16 }) as const,
};

export function linearGradient(colors: Color[], opts: Parameters<typeof makeGradient>[2] = {}): Gradient {
  return makeGradient("linear", colors, opts);
}
export function radialGradient(colors: Color[], opts: Parameters<typeof makeGradient>[2] = {}): Gradient {
  return makeGradient("radial", colors, opts);
}
export function conicGradient(colors: Color[], opts: Parameters<typeof makeGradient>[2] = {}): Gradient {
  return makeGradient("conic", colors, opts);
}
export type { GradientKind };
