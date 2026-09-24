import { Color, namedColor } from "./color.ts";
import { dsFont, dsLength, num } from "./ds.ts";

/**
 * Runtime value representations. Generated code and the TSX API construct these; lowering turns
 * them into CSS. A bare number is a length in design px (ds) wherever a length is expected.
 */

export type Sizing = "fill" | "hug";

export interface Px {
  readonly $: "px";
  readonly v: number;
}
export interface Pct {
  readonly $: "pct";
  readonly v: number;
}
export interface Fr {
  readonly $: "fr";
  readonly v: number;
}
/** Explicit ds, identical to a bare number. */
export interface Ds {
  readonly $: "ds";
  readonly v: number;
}
/** A viewport length: `100dvh`, `50vw` (full-screen layouts; everything else is ds). */
export interface Vp {
  readonly $: "vp";
  readonly v: number;
  readonly u: "vw" | "vh" | "dvh" | "svh" | "lvh";
}
/** Mixed-unit arithmetic (`100dvh - 56`), kept exact as CSS `calc()`. */
export interface Calc {
  readonly $: "calc";
  readonly op: "+" | "-" | "*" | "/";
  readonly a: Length;
  readonly b: Length | number;
}
/** A length given per frame: `{ m: 32, w: 64 }`; interpolated unless `step`. */
export interface PerFrame<T = Length> {
  readonly $: "frames";
  readonly values: Readonly<Record<string, T>>;
  readonly step: boolean;
}

export type Length = number | Px | Pct | Fr | Ds | Vp | Calc | Sizing;

export const px = (v: number): Px => ({ $: "px", v });
export const pct = (v: number): Pct => ({ $: "pct", v });
export const fr = (v: number): Fr => ({ $: "fr", v });
export const ds = (v: number): Ds => ({ $: "ds", v });
export const vp = (v: number, u: Vp["u"]): Vp => ({ $: "vp", v, u });

export function isLengthObj(v: unknown): v is Px | Pct | Fr | Ds | Vp | Calc {
  return typeof v === "object" && v !== null && "$" in v && ["px", "pct", "fr", "ds", "vp", "calc"].includes((v as { $: string }).$);
}

/** Converts a length to CSS. `fill`/`hug` are handled by layout classes, so they map to `auto` here. */
export function lengthCss(v: Length, font = false): string {
  if (typeof v === "number") return font ? dsFont(v) : dsLength(v);
  if (v === "fill" || v === "hug") return "auto";
  switch (v.$) {
    case "px":
      return `${num(v.v)}px`;
    case "pct":
      return `${num(v.v)}%`;
    case "fr":
      return `${num(v.v)}fr`;
    case "ds":
      return font ? dsFont(v.v) : dsLength(v.v);
    case "vp":
      return `${num(v.v)}${v.u}`;
    case "calc": {
      const inner = (x: Length | number) => {
        const s = typeof x === "number" && (v.op === "*" || v.op === "/") ? num(x) : lengthCss(x as Length, font);
        return s.startsWith("calc(") ? s.slice(4) : s;
      };
      return `calc(${inner(v.a)} ${v.op} ${inner(v.b)})`;
    }
  }
}

export function lengthValue(v: Length): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return 0;
  return v.$ === "calc" ? 0 : v.v;
}

// ------------------------------------------------------------------ insets

export interface Insets {
  readonly $: "insets";
  readonly top: Length;
  readonly right: Length;
  readonly bottom: Length;
  readonly left: Length;
  /** When set, left/right follow writing direction (start/end). */
  readonly logical?: boolean;
}

export function all(v: Length): Insets {
  return { $: "insets", top: v, right: v, bottom: v, left: v };
}

/** `sym(x: 20, y: 10)` or positional `sym(20, 10)` (x, y). */
export function sym(x: Length = 0, y: Length = 0): Insets {
  return { $: "insets", top: y, right: x, bottom: y, left: x };
}

export function only(o: { left?: Length; right?: Length; top?: Length; bottom?: Length; start?: Length; end?: Length }): Insets {
  const logical = o.start !== undefined || o.end !== undefined;
  return {
    $: "insets",
    top: o.top ?? 0,
    bottom: o.bottom ?? 0,
    left: o.start ?? o.left ?? 0,
    right: o.end ?? o.right ?? 0,
    logical,
  };
}

export function isInsets(v: unknown): v is Insets {
  return typeof v === "object" && v !== null && (v as { $?: string }).$ === "insets";
}

export function toInsets(v: Insets | Length): Insets {
  return isInsets(v) ? v : all(v);
}

export function insetsCss(v: Insets | Length): string {
  const i = toInsets(v);
  const [t, r, b, l] = [i.top, i.right, i.bottom, i.left].map((x) => lengthCss(x));
  if (t === b && r === l) return t === r ? (t as string) : `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
}

// ------------------------------------------------------------------ size

export interface Size {
  readonly $: "size";
  readonly w: Length;
  readonly h: Length;
}

export function size(w: Length, h: Length = w): Size {
  return { $: "size", w, h };
}

export function isSize(v: unknown): v is Size {
  return typeof v === "object" && v !== null && (v as { $?: string }).$ === "size";
}

// ------------------------------------------------------------------ arithmetic on LAYR values

type Num = number;

function mapLen(a: Length, f: (n: Num) => Num, op?: Calc["op"], by?: number): Length {
  if (typeof a === "number") return f(a);
  if (typeof a === "string") return a;
  if (a.$ === "calc") return op && by !== undefined ? { $: "calc", op, a, b: by } : a;
  return { ...a, v: f(a.v) } as Length;
}

/** The unit a length is written in; a bare number is ds. */
function unitOf(x: Length): string {
  if (typeof x === "number") return "ds";
  if (typeof x === "string") return x;
  return x.$ === "vp" ? x.u : x.$;
}

function zipLen(a: Length, b: Length, f: (x: Num, y: Num) => Num, op: Calc["op"] = "+"): Length {
  if (typeof a === "number" && typeof b === "number") return f(a, b);
  const ua = unitOf(a);
  const ub = unitOf(b);
  // Same unit: fold the numbers. Different units: exact CSS calc (a bare number stays ds).
  if (ua === ub && ua !== "calc") {
    if (typeof a === "object" && typeof b === "object" && a.$ !== "calc" && b.$ !== "calc") return { ...a, v: f(a.v, b.v) } as Length;
    if (typeof a === "object" && typeof b === "number" && a.$ !== "calc") return { ...a, v: f(a.v, b) } as Length;
    if (typeof a === "number" && typeof b === "object" && b.$ !== "calc") return { ...b, v: f(a, b.v) } as Length;
  }
  if (typeof a === "string" || typeof b === "string") return a;
  return { $: "calc", op, a, b };
}

/** Generic arithmetic used by compiled LAYR expressions (numbers, lengths, insets, sizes). */
export function arith(op: "+" | "-" | "*" | "/", a: unknown, b: unknown): unknown {
  const f = (x: Num, y: Num) => (op === "+" ? x + y : op === "-" ? x - y : op === "*" ? x * y : x / y);
  if (typeof a === "number" && typeof b === "number") return f(a, b);
  if (typeof a === "string" || typeof b === "string") return op === "+" ? `${a}${b}` : Number.NaN;
  const scale = op === "*" || op === "/";
  if (isInsets(a)) {
    if (isInsets(b))
      return { ...a, top: zipLen(a.top, b.top, f, op), right: zipLen(a.right, b.right, f, op), bottom: zipLen(a.bottom, b.bottom, f, op), left: zipLen(a.left, b.left, f, op) };
    if (typeof b === "number") {
      const g = (x: Length) => (scale ? mapLen(x, (n) => f(n, b), op, b) : zipLen(x, b, f, op));
      return { ...a, top: g(a.top), right: g(a.right), bottom: g(a.bottom), left: g(a.left) };
    }
  }
  if (isSize(a)) {
    if (isSize(b)) return { ...a, w: zipLen(a.w, b.w, f, op), h: zipLen(a.h, b.h, f, op) };
    if (typeof b === "number") return { ...a, w: mapLen(a.w, (n) => f(n, b), op, b), h: mapLen(a.h, (n) => f(n, b), op, b) };
  }
  if (isLengthObj(a) && typeof b === "number" && scale) return mapLen(a, (n) => f(n, b), op, b);
  if (isLengthObj(a) && (typeof b === "number" || isLengthObj(b))) return zipLen(a, b as Length, f, op);
  if (typeof a === "number" && isLengthObj(b)) return scale && op === "*" ? mapLen(b, (n) => f(a, n), op, a) : zipLen(a, b, f, op);
  return Number.NaN;
}

// ------------------------------------------------------------------ colours, paints

export type Paint = Color | Gradient;

export function toColor(v: unknown): Color | null {
  if (v instanceof Color) return v;
  if (typeof v === "string") return v.startsWith("#") ? Color.hex(v) : namedColor(v);
  return null;
}

export type GradientKind = "linear" | "radial" | "conic";

export interface Gradient {
  readonly $: "gradient";
  readonly kind: GradientKind;
  readonly colors: readonly Color[];
  readonly stops: readonly number[] | null;
  /** Linear: from/to alignment; conic: start angle; radial: center alignment. */
  readonly from: string;
  readonly to: string;
  readonly angle: number;
}

export function gradient(kind: GradientKind, colors: Color[], opts: { stops?: number[]; from?: string; to?: string; angle?: number } = {}): Gradient {
  return {
    $: "gradient",
    kind,
    colors,
    stops: opts.stops ?? null,
    from: opts.from ?? (kind === "linear" ? "topMid" : "mid"),
    to: opts.to ?? "bottomMid",
    angle: opts.angle ?? 0,
  };
}

const ALIGN_XY: Record<string, [number, number]> = {
  topLeft: [0, 0],
  topMid: [0.5, 0],
  topRight: [1, 0],
  midLeft: [0, 0.5],
  mid: [0.5, 0.5],
  midRight: [1, 0.5],
  bottomLeft: [0, 1],
  bottomMid: [0.5, 1],
  bottomRight: [1, 1],
};

export function alignPoint(a: string): [number, number] {
  return ALIGN_XY[a] ?? [0.5, 0.5];
}

export function gradientCss(g: Gradient): string {
  const stops = g.colors
    .map((c, i) => {
      const s = g.stops?.[i];
      return s === undefined ? c.toCss() : `${c.toCss()} ${num(s * 100)}%`;
    })
    .join(", ");
  if (g.kind === "radial") {
    const [x, y] = alignPoint(g.from);
    return `radial-gradient(circle at ${num(x * 100)}% ${num(y * 100)}%, ${stops})`;
  }
  if (g.kind === "conic") {
    const [x, y] = alignPoint(g.from);
    return `conic-gradient(from ${num(g.angle)}deg at ${num(x * 100)}% ${num(y * 100)}%, ${stops})`;
  }
  const [x1, y1] = alignPoint(g.from);
  const [x2, y2] = alignPoint(g.to);
  // CSS angle: 0deg points up, clockwise.
  const angle = (Math.atan2(x2 - x1, -(y2 - y1)) * 180) / Math.PI;
  return `linear-gradient(${num((angle + 360) % 360)}deg, ${stops})`;
}

export function paintCss(v: unknown): { color?: string; image?: string } {
  if (typeof v === "object" && v !== null && (v as { $?: string }).$ === "gradient") return { image: gradientCss(v as Gradient) };
  const c = toColor(v);
  return c ? { color: c.toCss() } : {};
}

// ------------------------------------------------------------------ border, shadow

export type BorderAlign = "in" | "mid" | "out";

export interface Border {
  readonly $: "border";
  readonly width: Length;
  readonly color: Color;
  readonly align: BorderAlign;
  readonly style: "solid" | "dashed" | "dotted";
}

export function border(o: { width?: Length; color?: Color | string; align?: BorderAlign; style?: Border["style"] }): Border {
  return { $: "border", width: o.width ?? 1, color: toColor(o.color) ?? new Color(0, 0, 0), align: o.align ?? "in", style: o.style ?? "solid" };
}

export interface Shadow {
  readonly $: "shadow";
  readonly x: Length;
  readonly y: Length;
  readonly blur: Length;
  readonly spread: Length;
  readonly color: Color;
  readonly inset: boolean;
}

export function shadow(o: { x?: Length; y?: Length; blur?: Length; spread?: Length; color?: Color | string; inset?: boolean }): Shadow {
  return {
    $: "shadow",
    x: o.x ?? 0,
    y: o.y ?? 4,
    blur: o.blur ?? 12,
    spread: o.spread ?? 0,
    color: toColor(o.color) ?? new Color(0, 0, 0, 0.2),
    inset: o.inset ?? false,
  };
}

export function shadowCss(v: Shadow | readonly Shadow[]): string {
  const list = Array.isArray(v) ? v : [v as Shadow];
  return list
    .map((s) => `${s.inset ? "inset " : ""}${lengthCss(s.x)} ${lengthCss(s.y)} ${lengthCss(s.blur)} ${lengthCss(s.spread)} ${s.color.toCss()}`)
    .join(", ");
}

// ------------------------------------------------------------------ motion values

export interface Spring {
  readonly $: "spring";
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}
export interface Ease {
  readonly $: "ease";
  readonly css: string;
  readonly duration?: number;
}

export const spring = {
  gentle: { $: "spring", stiffness: 120, damping: 20, mass: 1 } as Spring,
  snappy: { $: "spring", stiffness: 300, damping: 30, mass: 1 } as Spring,
  bounce: { $: "spring", stiffness: 260, damping: 12, mass: 1 } as Spring,
  slow: { $: "spring", stiffness: 60, damping: 18, mass: 1 } as Spring,
  custom: (stiffness: number, damping: number, mass = 1): Spring => ({ $: "spring", stiffness, damping, mass }),
};

export const ease = {
  linear: { $: "ease", css: "linear" } as Ease,
  in: { $: "ease", css: "cubic-bezier(0.4, 0, 1, 1)" } as Ease,
  out: { $: "ease", css: "cubic-bezier(0, 0, 0.2, 1)" } as Ease,
  inOut: { $: "ease", css: "cubic-bezier(0.4, 0, 0.2, 1)" } as Ease,
  emphasized: { $: "ease", css: "cubic-bezier(0.2, 0, 0, 1)" } as Ease,
  bezier: (a: number, b: number, c: number, d: number): Ease => ({ $: "ease", css: `cubic-bezier(${a}, ${b}, ${c}, ${d})` }),
};
