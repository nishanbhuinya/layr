/**
 * RichText markup: styled runs inside one string, compiled and checked at build time when the
 * string is constant, parsed at run time when it is not. React-free (the compiler and the renderer
 * share it).
 *
 *   (style, style…)[text]   styled run, nestable: colours (`blue`, `#000`, `accent`, `green.50` =
 *                           50% opacity), a size (`24`), `weight.700`/`bold`, `italic`, `underline`,
 *                           `strike`, `code`, `hL.green.30` (highlight), `link: /docs`
 *   *bold*  _italic_  `code`  ~strike~
 *   \n hard line break · a blank line starts a paragraph · other line breaks are spaces
 *   /(…)  /*  /_  /`  /~   a slash before an opener prints it literally; `//(` prints `/(` …
 *
 * Interpolated values (`$name`, `${expr}`) are text, never markup.
 */

export interface RichStyle {
  bold?: boolean;
  weight?: number;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  /** A colour token as written (`blue`, `#000`, `accent`) and its opacity (0–1). */
  color?: { name: string; alpha: number };
  highlight?: { name: string; alpha: number };
  /** Font size in design px. */
  size?: number;
  link?: string;
}

export type RichNode =
  | { t: "text"; s: string }
  | { t: "br" }
  | { t: "span"; style: RichStyle; kids: RichNode[] };

export interface RichProblem {
  message: string;
  /** Offset in the segment it came from, and which segment. */
  at: number;
  seg: number;
}

/** A piece of the source: markup text (escapes not yet read) or an interpolated value (plain text). */
export type RichSegment = string | { value: unknown };

const OPENERS = new Set(["(", "*", "_", "`", "~"]);
const MARKS: Record<string, keyof RichStyle> = { "*": "bold", _: "italic", "`": "code", "~": "strike" };
const WEIGHTS: Record<string, number> = { thin: 100, light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, black: 900 };

/** Paragraphs of runs. */
export function parseRich(segments: readonly RichSegment[], isColor: (name: string) => boolean = () => true): { paras: RichNode[][]; problems: RichProblem[] } {
  // One stream of characters; a value is one opaque item.
  type Ch = { c: string; seg: number; at: number } | { v: string };
  const stream: Ch[] = [];
  segments.forEach((s, seg) => {
    if (typeof s !== "string") {
      stream.push({ v: s.value == null ? "" : String(s.value) });
      return;
    }
    for (let i = 0; i < s.length; i++) {
      const c = s[i] as string;
      if (c === "\\" && i + 1 < s.length) {
        const n = s[i + 1] as string;
        stream.push({ c: n === "n" ? " " : n === "t" ? "\t" : n, seg, at: i });
        // An escaped character is literal text: mark it so markup does not read it.
        (stream.at(-1) as { lit?: boolean }).lit = n !== "n";
        i++;
        continue;
      }
      stream.push({ c, seg, at: i });
    }
  });
  const problems: RichProblem[] = [];
  const ch = (k: number) => {
    const x = stream[k];
    return x && "c" in x && !(x as { lit?: boolean }).lit ? x.c : undefined;
  };
  const isWord = (k: number) => {
    const x = stream[k];
    if (!x) return false;
    if ("v" in x) return x.v.length > 0;
    return /[\p{L}\p{N}]/u.test(x.c);
  };
  const isSpace = (k: number) => {
    const c = ch(k);
    return c === undefined ? !stream[k] : /\s/.test(c);
  };

  /** Parses runs from `k` until `stop` (a closing char) or `end`; returns nodes and the index after. */
  const runs = (k: number, stop: string | null, end = stream.length): [RichNode[], number] => {
    const out: RichNode[] = [];
    let text = "";
    const flush = () => {
      if (text) out.push({ t: "text", s: text });
      text = "";
    };
    while (k < end) {
      const x = stream[k] as Ch;
      if ("v" in x) {
        text += x.v;
        k++;
        continue;
      }
      const c = ch(k);
      if (c === undefined) {
        text += x.c;
        k++;
        continue;
      }
      if (stop && c === stop) {
        flush();
        return [out, k + 1];
      }
      if (c === " ") {
        flush();
        out.push({ t: "br" });
        k++;
        continue;
      }
      // Nullifiers: k slashes before an opener print k-1 slashes and the opener itself.
      if (c === "/") {
        let j = k;
        while (ch(j) === "/") j++;
        const next = ch(j);
        if (next !== undefined && OPENERS.has(next)) {
          text += "/".repeat(j - k - 1) + next;
          k = j + 1;
          continue;
        }
        text += "/".repeat(j - k);
        k = j;
        continue;
      }
      if (c === "(") {
        const close = findStyleClose(k, end);
        if (close > 0) {
          const spec = stream.slice(k + 1, close).map((y) => ("c" in y ? y.c : y.v)).join("");
          const first = stream[k] as { seg: number; at: number };
          const style = parseStyle(spec, isColor, (m) => problems.push({ message: m, at: first.at, seg: first.seg }));
          if (style) {
            flush();
            const [kids, after] = runs(close + 2, "]", end);
            out.push({ t: "span", style, kids });
            k = after;
            continue;
          }
        }
      }
      const mark = MARKS[c];
      if (mark && !isWord(k - 1) && !isSpace(k + 1)) {
        const close = findMarkClose(k, c, end);
        if (close > 0) {
          flush();
          if (mark === "code") {
            const s = stream.slice(k + 1, close).map((y) => ("c" in y ? (y.c === " " ? "\n" : y.c) : y.v)).join("");
            out.push({ t: "span", style: { code: true }, kids: [{ t: "text", s }] });
          } else {
            const [kids] = runs(k + 1, null, close);
            out.push({ t: "span", style: { [mark]: true }, kids });
          }
          k = close + 1;
          continue;
        }
      }
      text += c;
      k++;
    }
    flush();
    return [out, k];
  };

  /** `(` … `)` directly followed by `[`: the index of `)`, or -1. */
  function findStyleClose(k: number, end: number): number {
    for (let j = k + 1; j < end; j++) {
      const c = ch(j);
      if (c === "(" || c === "[" || c === "]" || c === " ") return -1;
      if (c === ")") return ch(j + 1) === "[" ? j : -1;
    }
    return -1;
  }

  /** The closing mark for an opener at `k`: preceded by a non-space, not followed by a word character. */
  function findMarkClose(k: number, m: string, end: number): number {
    for (let j = k + 1; j < end; j++) {
      const c = ch(j);
      if (c === "]" && m !== "`") return -1;
      if (c === m && !isSpace(j - 1) && j > k + 1 && !isWord(j + 1)) return j;
    }
    return -1;
  }

  const [nodes] = runs(0, null);
  return { paras: paragraphs(nodes), problems };
}

/** Line breaks in the source: one is a space, a blank line starts a paragraph; indentation goes. */
function paragraphs(nodes: RichNode[]): RichNode[][] {
  const paras: RichNode[][] = [[]];
  const push = (n: RichNode) => (paras.at(-1) as RichNode[]).push(n);
  for (const n of nodes) {
    if (n.t !== "text") {
      push(n.t === "span" ? { ...n, kids: n.kids.map(spaceOnly) } : n);
      continue;
    }
    const parts = n.s.split(/[ \t]*\n(?:[ \t]*\n)+[ \t]*/);
    parts.forEach((p, i) => {
      if (i > 0) paras.push([]);
      const s = p.replace(/[ \t]*\n[ \t]*/g, " ");
      if (s) push({ t: "text", s });
    });
  }
  // Trim each paragraph's ends and drop empty ones.
  return paras
    .map((p) => {
      const first = p[0];
      if (first?.t === "text") p[0] = { t: "text", s: first.s.replace(/^\s+/, "") };
      const last = p.at(-1);
      if (last?.t === "text") p[p.length - 1] = { t: "text", s: last.s.replace(/\s+$/, "") };
      return p.filter((x) => x.t !== "text" || x.s.length);
    })
    .filter((p) => p.length);
}

function spaceOnly(n: RichNode): RichNode {
  if (n.t === "text") return { t: "text", s: n.s.replace(/[ \t]*\n[ \t]*/g, " ") };
  if (n.t === "span") return { ...n, kids: n.kids.map(spaceOnly) };
  return n;
}

/** `grey.90, weight.700, italic, 35, hL.green.30, link: /docs` → a style; null when it is not one (then the text is literal). */
export function parseStyle(spec: string, isColor: (name: string) => boolean, problem: (message: string) => void): RichStyle | null {
  const style: RichStyle = {};
  const tokens = spec.split(",").map((s) => s.trim());
  if (!tokens.length || tokens.some((t) => !t)) return null;
  for (const tok of tokens) {
    const link = tok.match(/^link\s*:\s*['"]?([^'"]+)['"]?$/);
    if (link) {
      style.link = link[1] as string;
      continue;
    }
    if (/^\d+(\.\d+)?$/.test(tok)) {
      style.size = Number(tok);
      continue;
    }
    const weight = tok.match(/^(?:weight|wight|w)\.(\d{3})$/);
    if (weight) {
      style.weight = Number(weight[1]);
      continue;
    }
    if (tok in WEIGHTS) {
      if (tok === "bold") style.bold = true;
      else style.weight = WEIGHTS[tok];
      continue;
    }
    if (tok === "italic" || tok === "underline" || tok === "strike" || tok === "code") {
      style[tok] = true;
      continue;
    }
    const hl = tok.match(/^(?:hL|hl|highlight)\.(#[0-9a-fA-F]{3,8}|[A-Za-z][\w]*)(?:\.(\d{1,3}))?$/);
    if (hl) {
      if (!isColor(hl[1] as string)) problem(`\`${hl[1]}\` is not a colour.`);
      style.highlight = { name: hl[1] as string, alpha: hl[2] ? Math.min(100, Number(hl[2])) / 100 : 1 };
      continue;
    }
    const color = tok.match(/^(#[0-9a-fA-F]{3,8}|[A-Za-z][\w]*)(?:\.(\d{1,3}))?$/);
    if (color && isColor(color[1] as string)) {
      style.color = { name: color[1] as string, alpha: color[2] ? Math.min(100, Number(color[2])) / 100 : 1 };
      continue;
    }
    // Not a style: the parentheses were prose. Say so only when it looked like one.
    if (tokens.length > 1 || color) problem(`\`${tok}\` is not a RichText style. Styles: a colour (blue, #000, accent, green.50), a size (24), weight.700, bold, italic, underline, strike, code, hL.colour, link: /path. Write \`/(\` for a literal parenthesis.`);
    return null;
  }
  return style;
}
