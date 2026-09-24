/**
 * Design Scale: LAYR's unit model.
 *
 * A design is authored against frames (m, t, w, uw by default). `ds` is one design pixel of the
 * active frame. A single value scales proportionally inside its frame, clamped so scaling
 * fine-tunes while frames re-layout. A value given at several frames is interpolated linearly
 * between the frames' design widths ("numbers flow, structure steps").
 *
 * On the web target all of this compiles to CSS. `--ds` and `--dsf` are registered as <length>
 * custom properties, so they resolve once where they are declared (root, Scaffold or subtree)
 * and inherit as absolute lengths; container units therefore always refer to the element that
 * declared the frame, never to a nested container.
 */

export interface Frame {
  name: string;
  /** Design width in design px (the Figma frame width). */
  w: number;
  /** Design height in design px. */
  h: number;
  /** Viewport (or container) width in CSS px at which this frame becomes active. */
  from: number;
  /** Handheld frames map shortest side to w and longest to h, so rotation does not rescale. */
  handheld: boolean;
}

export interface ScaleClamp {
  lo: number;
  hi: number;
}

export interface FontScale extends ScaleClamp {
  /** Weight of the rem term in the preferred font size (0..1). Keeps browser zoom and the user's font size effective. */
  alpha: number;
  /** In handheld landscape, fonts follow the base scale instead of the gentler curve. */
  tightInLandscape: boolean;
}

export interface DesignScaleConfig {
  frames: Frame[];
  scale: ScaleClamp;
  font: FontScale;
}

export type Fit = "width" | "contain" | "cover";

export const DEFAULT_FRAMES: readonly Frame[] = [
  { name: "m", w: 390, h: 844, from: 0, handheld: true },
  { name: "t", w: 834, h: 1194, from: 600, handheld: true },
  { name: "w", w: 1440, h: 900, from: 1024, handheld: false },
  { name: "uw", w: 2560, h: 1080, from: 1920, handheld: false },
];

export const DEFAULT_DESIGN_SCALE: DesignScaleConfig = {
  frames: [...DEFAULT_FRAMES],
  scale: { lo: 0.9, hi: 1.15 },
  font: { lo: 0.95, hi: 1.1, alpha: 0.5, tightInLandscape: true },
};

const REM = 16;

/** Formats a number for CSS without float noise. */
export function num(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return s === "-0" ? "0" : s;
}

function rem(px: number): string {
  return `${num(px / REM)}rem`;
}

type Basis = "viewport" | "container";

function axisUnits(frame: Frame, basis: Basis): { x: string; y: string } {
  if (basis === "container") return { x: "100cqw", y: "100cqh" };
  return frame.handheld ? { x: "100vmin", y: "100vmax" } : { x: "100vw", y: "100vh" };
}

function ratio(frame: Frame, fit: Fit, basis: Basis): string {
  const u = axisUnits(frame, basis);
  const rw = `${u.x} / ${num(frame.w)}`;
  // Container height is usually content-driven, so container fits are width-only.
  if (fit === "width" || basis === "container") return rw;
  const rh = `${u.y} / ${num(frame.h)}`;
  return fit === "contain" ? `min(${rw}, ${rh})` : `max(${rw}, ${rh})`;
}

/**
 * Registered lengths are stored with limited precision (Firefox rounds to 1/60 px), so the
 * variables hold the length of UNIT design px rather than one; multiplying a rounded 1px would
 * magnify the error by the value.
 */
export const UNIT = 1000;

/** The value of `--ds` (length of UNIT design px) for a frame. */
export function scaleValue(frame: Frame, cfg: DesignScaleConfig, fit: Fit, basis: Basis = "viewport"): string {
  return `clamp(${rem(cfg.scale.lo * UNIT)}, ${UNIT} * ${ratio(frame, fit, basis)}, ${rem(cfg.scale.hi * UNIT)})`;
}

/** The value of `--dsf` (UNIT design px of font size) for a frame. The rem term keeps zoom and user font size effective. */
export function fontValue(frame: Frame, cfg: DesignScaleConfig, fit: Fit, basis: Basis = "viewport"): string {
  const a = cfg.font.alpha;
  const preferred = `calc(${rem(a * UNIT)} + ${num((1 - a) * UNIT)} * ${ratio(frame, fit, basis)})`;
  return `clamp(${rem(cfg.font.lo * UNIT)}, ${preferred}, ${rem(cfg.font.hi * UNIT)})`;
}

export const REGISTER_PROPERTIES = [
  "@property --ds { syntax: '<length>'; inherits: true; initial-value: 1000px; }",
  "@property --dsf { syntax: '<length>'; inherits: true; initial-value: 1000px; }",
  // Scroll edge fades (`Scroll(fade: 24)`), animated by the scroll position.
  "@property --l-fa { syntax: '<length>'; inherits: false; initial-value: 0px; }",
  "@property --l-fb { syntax: '<length>'; inherits: false; initial-value: 0px; }",
].join("\n");

function sortedFrames(cfg: DesignScaleConfig): Frame[] {
  return [...cfg.frames].sort((a, b) => a.from - b.from);
}

/**
 * CSS establishing the scale for `selector`. `basis: "container"` scales against the selector's
 * own inline size (subtree Design Scale) and selects frames with container queries.
 */
export function scaleCss(
  cfg: DesignScaleConfig,
  opts: { selector?: string; fit?: Fit; basis?: Basis } = {},
): string {
  const selector = opts.selector ?? ":root";
  const fit = opts.fit ?? "width";
  const basis = opts.basis ?? "viewport";
  const frames = sortedFrames(cfg);
  const out: string[] = [];
  if (basis === "container") out.push(`${selector} { container-type: inline-size; }`);
  // Container-relative values must be declared on the children: an element cannot query itself.
  const target = basis === "container" ? `${selector} > *` : selector;
  const query = basis === "container" ? "@container" : "@media";
  frames.forEach((f, i) => {
    const next = frames[i + 1];
    const decl = `${target} { --ds: ${scaleValue(f, cfg, fit, basis)}; --dsf: ${fontValue(f, cfg, fit, basis)}; }`;
    out.push(f.from <= 0 && i === 0 ? decl : `${query} (min-width: ${num(f.from)}px) { ${decl} }`);
    if (f.handheld && cfg.font.tightInLandscape && basis === "viewport") {
      const range = next ? ` and (max-width: ${num(next.from - 0.02)}px)` : "";
      const lower = f.from > 0 ? ` and (min-width: ${num(f.from)}px)` : "";
      out.push(`@media (orientation: landscape)${lower}${range} { ${target} { --dsf: var(--ds); } }`);
    }
  });
  return out.join("\n");
}

/** A single design value: proportional inside the active frame. */
export function dsLength(n: number): string {
  return n === 0 ? "0px" : `calc(${num(n)} * var(--ds) / ${UNIT})`;
}

export function dsFont(n: number): string {
  return `calc(${num(n)} * var(--dsf) / ${UNIT})`;
}

export interface Anchor {
  /** The frame's design width (viewport CSS px where the value is exact). */
  at: number;
  value: number;
}

export interface Piece {
  /** Media condition (without `@media`), or null for the unconditional base. */
  media: string | null;
  value: string;
}

/**
 * A value given at several frames. Between two anchors it follows a straight line in viewport
 * width with a rem intercept (zoom-safe); outside the outermost anchors it scales like a single
 * value. Pieces are ordered so later ones override earlier ones in the cascade.
 */
export function interpolate(anchors: Anchor[], kind: "length" | "font" = "length"): Piece[] {
  const pts = [...anchors].sort((a, b) => a.at - b.at);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) throw new Error("interpolate: no anchors");
  const single = kind === "font" ? dsFont : dsLength;
  if (pts.length === 1) return [{ media: null, value: single(first.value) }];
  const pieces: Piece[] = [{ media: null, value: single(first.value) }];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i] as Anchor;
    const b = pts[i + 1] as Anchor;
    const slope = (b.value - a.value) / (b.at - a.at);
    const intercept = a.value - slope * a.at;
    const lo = Math.min(a.value, b.value);
    const hi = Math.max(a.value, b.value);
    const line = `calc(${rem(intercept)} + ${num(slope * 100)}vw)`;
    pieces.push({ media: `(min-width: ${num(a.at)}px)`, value: `clamp(${rem(lo)}, ${line}, ${rem(hi)})` });
  }
  pieces.push({ media: `(min-width: ${num(last.at)}px)`, value: single(last.value) });
  return pieces;
}

/** Ratio of the largest to the smallest size a font reaches across its range (WCAG 1.4.4 needs ≤ 2.5). */
export function fontRangeRatio(cfg: DesignScaleConfig, anchors: Anchor[]): number {
  const values = anchors.map((a) => a.value);
  const max = Math.max(...values) * cfg.font.hi;
  const min = Math.min(...values) * cfg.font.lo;
  return max / min;
}
