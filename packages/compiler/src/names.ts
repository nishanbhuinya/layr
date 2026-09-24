/** Builtins available in LAYR expressions and their runtime code. */
export interface Builtin {
  code: string;
  /** Result type for simple inference. */
  type: string;
  doc: string;
  /** Call-style builtin taking named arguments as an object. */
  named?: boolean;
}

export const VALUE_BUILTINS: Record<string, Builtin> = {
  all: { code: "$V.all", type: "insets", doc: "Same inset on all sides: `all(20)`." },
  sym: { code: "$V.sym", type: "insets", doc: "Symmetric insets: `sym(x: 20, y: 10)`." },
  only: { code: "$V.only", type: "insets", doc: "Specific sides: `only(left: 20, top: 8)`.", named: true },
  rgb: { code: "$V.rgb", type: "color", doc: "`rgb(255, 255, 255)`." },
  rgba: { code: "$V.rgb", type: "color", doc: "`rgba(255, 255, 255, 0.5)`." },
  rgbo: { code: "$V.rgb", type: "color", doc: "Alias of rgba." },
  hsl: { code: "$V.hsl", type: "color", doc: "`hsl(210, 80%, 50%)`." },
  shadow: { code: "$V.shadow", type: "shadow", doc: "`shadow(x: 0, y: 4, blur: 12, spread: 0, color: black.alpha(20%))`.", named: true },
  border: { code: "$V.border", type: "border", doc: "`border(width: 1, color: #000, align: in)`.", named: true },
  size: { code: "$V.size", type: "size", doc: "`size(200, 120)`." },
  px: { code: "$V.px", type: "len", doc: "Absolute CSS pixels." },
  fade: { code: "$V.motion.fade", type: "motion", doc: "Enter/exit fade." },
  slide: { code: "$V.motion.slide", type: "motion", doc: "Enter/exit slide: `slide(y: 20)`.", named: true },
  scale: { code: "$V.motion.scale", type: "motion", doc: "Enter/exit scale: `scale(0.95)`." },
  go: { code: "$.go", type: "void", doc: "Navigate: `go(DemoPage, id: 3)`." },
  back: { code: "$.back", type: "void", doc: "Navigate back." },
  wait: { code: "$ctx.wait", type: "void", doc: "Pause an action: `wait(100ms)`." },
  print: { code: "console.log", type: "void", doc: "Log to the console." },
  min: { code: "Math.min", type: "num", doc: "Smallest value." },
  max: { code: "Math.max", type: "num", doc: "Largest value." },
  clamp: { code: "$V.clampNum", type: "num", doc: "`clamp(value, lo, hi)`." },
  round: { code: "Math.round", type: "num", doc: "Round to an integer." },
  floor: { code: "Math.floor", type: "num", doc: "Round down." },
  ceil: { code: "Math.ceil", type: "num", doc: "Round up." },
  abs: { code: "Math.abs", type: "num", doc: "Absolute value." },
  txt: { code: "String", type: "txt", doc: "Convert to text." },
  LinearGradient: { code: "$V.linearGradient", type: "paint", doc: "`LinearGradient(.colors(a, b) .stops(0, 1) .direction(tL, bR))`." },
  RadialGradient: { code: "$V.radialGradient", type: "paint", doc: "`RadialGradient(.colors(a, b) .center(mid))`." },
  ConicGradient: { code: "$V.conicGradient", type: "paint", doc: "`ConicGradient(.colors(a, b, a) .angle(0))`." },
  AngularGradient: { code: "$V.conicGradient", type: "paint", doc: "Alias of ConicGradient." },
};

/** Namespaced builtins (`spring.gentle`, `ease.inOut`, `frame.m`). */
export const NAMESPACES: Record<string, { code: string; members: string[]; type: string }> = {
  spring: { code: "$V.spring", members: ["gentle", "snappy", "bounce", "slow", "custom"], type: "motion" },
  ease: { code: "$V.ease", members: ["linear", "in", "out", "inOut", "emphasized", "bezier"], type: "motion" },
  frame: { code: "$.frame", members: ["name", "w", "scale"], type: "any" },
  route: { code: "$route", members: [], type: "any" },
};

/** Non-canonical builtin spellings → canonical (formatter + analyzer). */
export const BUILTIN_ALIASES: Record<string, string> = {
  rgbo: "rgba",
  AngularGradient: "ConicGradient",
  curveInOut: "ease.inOut",
  curveIn: "ease.in",
  curveOut: "ease.out",
  springGentle: "spring.gentle",
  springBounce: "spring.bounce",
  springSnappy: "spring.snappy",
};

/** Colour method aliases → canonical. */
export const COLOR_METHOD_ALIASES: Record<string, string> = { opacity: "alpha", aplha: "alpha" };

export const CONSTRUCT_NAMES = new Set(["App", "Page", "Widget", "Function", "Preset", "DesignScale", "Theme", "Extract", "Inject", "Export", "Var"]);

export const RENDERED_FEATURES: Record<string, string> = { size: "size", pos: "size", visible: "bool" };

export function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function pascal(s: string): string {
  return s
    .replace(/\.layr$/, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

/** Levenshtein distance for "did you mean" suggestions. */
export function distance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]) as number[][];
  for (let j = 1; j <= n; j++) (dp[0] as number[])[j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      const row = dp[i] as number[];
      const prev = dp[i - 1] as number[];
      row[j] = Math.min((prev[j] as number) + 1, (row[j - 1] as number) + 1, (prev[j - 1] as number) + (a[i - 1]?.toLowerCase() === b[j - 1]?.toLowerCase() ? 0 : 1));
    }
  return (dp[m] as number[])[n] as number;
}

export function suggest(name: string, candidates: Iterable<string>, max = 3): string[] {
  return [...candidates]
    .map((c) => [c, distance(name, c)] as const)
    .filter(([, d]) => d <= Math.max(2, Math.floor(name.length / 3)))
    .sort((a, b) => a[1] - b[1])
    .slice(0, max)
    .map(([c]) => c);
}
