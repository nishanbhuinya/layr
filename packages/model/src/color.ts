/** LAYR colours: immutable RGBA values with the operations the language exposes. */
export class Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
  /**
   * CSS for a colour that is not a constant: a theme token (`var(--layr-color-ink)`) or an
   * operation on one (`color-mix(...)`). The channels keep the light-theme value as a fallback.
   */
  readonly css: string | null;

  constructor(r: number, g: number, b: number, a = 1, css: string | null = null) {
    this.r = clamp255(r);
    this.g = clamp255(g);
    this.b = clamp255(b);
    this.a = Math.max(0, Math.min(1, a));
    this.css = css;
  }

  /** A theme colour: follows `--layr-color-<name>`, so light/dark themes switch it in CSS. */
  static token(name: string, hex: string): Color {
    const c = Color.hex(hex);
    return new Color(c.r, c.g, c.b, c.a, `var(--layr-color-${name})`);
  }

  private derive(c: Color, css: () => string): Color {
    return this.css === null ? c : new Color(c.r, c.g, c.b, c.a, css());
  }

  static hex(hex: string): Color {
    const h = hex.replace(/^#/, "");
    const full = h.length <= 4 ? [...h].map((c) => c + c).join("") : h;
    const n = (i: number) => Number.parseInt(full.slice(i, i + 2), 16);
    return new Color(n(0), n(2), n(4), full.length === 8 ? n(6) / 255 : 1);
  }

  /** 0xAARRGGBB (Flutter-style). */
  static argb(v: number): Color {
    return new Color((v >>> 16) & 255, (v >>> 8) & 255, v & 255, ((v >>> 24) & 255) / 255);
  }

  /** `.alpha(50%)` → 0.5, `.alpha(.5)`, `.alpha(127)` (0–255 when > 1). */
  alpha(v: number | Fraction): Color {
    const k = fraction(v, 255);
    return this.derive(new Color(this.r, this.g, this.b, k), () => `color-mix(in srgb, ${this.css} ${pct(k)}, transparent)`);
  }

  /** Mix toward black by `n` steps of 8 %. */
  shade(n = 1): Color {
    return this.mix(BLACK, Math.min(1, n * 0.08));
  }

  /** Mix toward white by `n` steps of 8 %. */
  tint(n = 1): Color {
    return this.mix(WHITE, Math.min(1, n * 0.08));
  }

  get invert(): Color {
    return this.derive(new Color(255 - this.r, 255 - this.g, 255 - this.b, this.a), () => `rgb(from ${this.css} calc(255 - r) calc(255 - g) calc(255 - b) / alpha)`);
  }

  mix(other: Color, t: number | Fraction = 0.5): Color {
    const k = fraction(t, 1);
    const m = (x: number, y: number) => x + (y - x) * k;
    const c = new Color(m(this.r, other.r), m(this.g, other.g), m(this.b, other.b), m(this.a, other.a));
    if (this.css === null && other.css === null) return c;
    return new Color(c.r, c.g, c.b, c.a, `color-mix(in srgb, ${this.toCss()}, ${other.toCss()} ${pct(k)})`);
  }

  toCss(): string {
    if (this.css !== null) return this.css;
    const hx = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    const base = `#${hx(this.r)}${hx(this.g)}${hx(this.b)}`;
    return this.a >= 1 ? base : `${base}${hx(this.a * 255)}`;
  }

  toString(): string {
    return this.toCss();
  }

  equals(o: Color): boolean {
    return this.r === o.r && this.g === o.g && this.b === o.b && this.a === o.a && this.css === o.css;
  }
}

/** A percentage as written in LAYR (`50%` → `{ $: "pct", v: 50 }`); `{ pct }` is accepted too. */
type Fraction = { $: "pct"; v: number } | { pct: number };

/** 50% → 0.5; numbers above 1 are read on the `scale` (255 for alpha). */
function fraction(v: number | Fraction, scale: number): number {
  if (typeof v === "object") return ("v" in v ? v.v : v.pct) / 100;
  return v > 1 && scale > 1 ? v / scale : v;
}

function pct(k: number): string {
  return `${Math.round(k * 10000) / 100}%`;
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, n));
}

const BLACK = new Color(0, 0, 0);
const WHITE = new Color(255, 255, 255);

/** CSS named colours LAYR recognises as bare identifiers. */
export const NAMED_COLORS: Record<string, string> = {
  transparent: "#00000000",
  black: "#000000",
  white: "#ffffff",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  rose: "#f43f5e",
  slate: "#64748b",
  gray: "#6b7280",
  grey: "#6b7280",
  zinc: "#71717a",
  neutral: "#737373",
  stone: "#78716c",
};

export function namedColor(name: string): Color | null {
  const hex = NAMED_COLORS[name];
  return hex ? Color.hex(hex) : null;
}
