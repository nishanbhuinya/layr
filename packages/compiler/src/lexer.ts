import type { Diagnostic, Span } from "./source.ts";

export type TokenKind =
  | "ident"
  | "number" // 200, 1.5, 200ds, 50%, 100ms, 0xff0d0d0d
  | "string"
  | "color" // #rgb #rgba #rrggbb #rrggbbaa
  | "block" // { raw TypeScript }
  | "jsx" // <tag ...>...</tag>: a React element, raw (the parser reads its structure)
  | "punct"
  | "eof";

export interface Token {
  kind: TokenKind;
  /** For punct: the operator text. For ident: the name. For string: the raw source between quotes. For block: inner text. */
  value: string;
  span: Span;
  /** True when a line break separates this token from the previous one. */
  nl: boolean;
  /** Numbers: parsed value and unit. */
  num?: number;
  unit?: string;
  /** Strings: the quote character. */
  quote?: string;
}

export interface Comment {
  text: string;
  span: Span;
  /** True if the comment starts a line (only whitespace before it on that line). */
  ownLine: boolean;
}

const PUNCT = [
  "...",
  "??=",
  "===",
  "!==",
  "=>",
  "??",
  "?.",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "(",
  ")",
  "[",
  "]",
  ",",
  ":",
  ".",
  "?",
  "!",
  "=",
  "<",
  ">",
  "+",
  "-",
  "*",
  "/",
  "%",
  "@",
  "&",
  "|",
  ";",
];

const isIdStart = (c: string) => /[A-Za-z_$]/.test(c);
const isId = (c: string) => /[A-Za-z0-9_$]/.test(c);
const isDigit = (c: string) => c >= "0" && c <= "9";
const isHex = (c: string) => /[0-9a-fA-F]/.test(c);

export interface LexResult {
  tokens: Token[];
  comments: Comment[];
  diagnostics: Diagnostic[];
}

export function lex(text: string): LexResult {
  const tokens: Token[] = [];
  const comments: Comment[] = [];
  const diagnostics: Diagnostic[] = [];
  let i = 0;
  let nl = true;
  let lineHasContent = false;

  const push = (t: Omit<Token, "nl">) => {
    tokens.push({ ...t, nl });
    nl = false;
    lineHasContent = true;
  };

  while (i < text.length) {
    const c = text[i] as string;
    if (c === "\n") {
      nl = true;
      lineHasContent = false;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r" || c === "﻿") {
      i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      const start = i;
      while (i < text.length && text[i] !== "\n") i++;
      comments.push({ text: text.slice(start, i).replace(/\r$/, ""), span: { start, end: i }, ownLine: !lineHasContent });
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const start = i;
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 2;
      if (end < 0) diagnostics.push(err("L0003", "Unterminated block comment.", start, i));
      comments.push({ text: text.slice(start, i), span: { start, end: i }, ownLine: !lineHasContent });
      if (text.slice(start, i).includes("\n")) nl = true;
      continue;
    }
    const start = i;
    if (c === "{") {
      const end = scanBlock(text, i);
      if (end < 0) {
        diagnostics.push(err("L0004", "Unterminated `{` block.", i, text.length));
        push({ kind: "block", value: text.slice(i + 1), span: { start, end: text.length } });
        i = text.length;
      } else {
        push({ kind: "block", value: text.slice(i + 1, end), span: { start, end: end + 1 } });
        i = end + 1;
      }
      continue;
    }
    if (c === "}") {
      diagnostics.push(err("L0005", "Unmatched `}`.", i, i + 1));
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      i++;
      let closed = false;
      while (i < text.length) {
        const d = text[i];
        if (d === "\\") {
          i += 2;
          continue;
        }
        if (d === c) {
          closed = true;
          break;
        }
        if (d === "\n" && c !== "`") break;
        if (d === "$" && text[i + 1] === "{") {
          const end = scanBlock(text, i + 1);
          i = end < 0 ? text.length : end + 1;
          continue;
        }
        i++;
      }
      if (!closed) diagnostics.push(err("L0002", "Unterminated string.", start, i));
      push({ kind: "string", value: text.slice(start + 1, i), quote: c, span: { start, end: closed ? i + 1 : i } });
      if (closed) i++;
      continue;
    }
    if (c === "#" && isHex(text[i + 1] ?? "")) {
      let j = i + 1;
      while (j < text.length && isHex(text[j] as string)) j++;
      const len = j - i - 1;
      if (!isId(text[j] ?? " ") && (len === 3 || len === 4 || len === 6 || len === 8)) {
        push({ kind: "color", value: text.slice(i + 1, j).toLowerCase(), span: { start, end: j } });
        i = j;
        continue;
      }
    }
    if (isDigit(c) || (c === "." && isDigit(text[i + 1] ?? ""))) {
      if (c === "0" && (text[i + 1] === "x" || text[i + 1] === "X")) {
        let j = i + 2;
        while (j < text.length && (isHex(text[j] as string) || text[j] === "_")) j++;
        const hex = text.slice(i + 2, j).replace(/_/g, "");
        push({ kind: "number", value: text.slice(i, j), num: Number.parseInt(hex, 16), unit: "hex", span: { start, end: j } });
        i = j;
        continue;
      }
      let j = i;
      while (j < text.length && (isDigit(text[j] as string) || text[j] === "_")) j++;
      if (text[j] === "." && isDigit(text[j + 1] ?? "")) {
        j++;
        while (j < text.length && isDigit(text[j] as string)) j++;
      }
      const numText = text.slice(i, j).replace(/_/g, "");
      let unit = "";
      if (text[j] === "%") {
        unit = "%";
        j++;
      } else if (/[a-z]/.test(text[j] ?? "")) {
        let k = j;
        while (k < text.length && /[a-z]/.test(text[k] as string)) k++;
        unit = text.slice(j, k);
        j = k;
      }
      push({ kind: "number", value: text.slice(i, j), num: Number.parseFloat(numText), unit, span: { start, end: j } });
      i = j;
      continue;
    }
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < text.length && isId(text[j] as string)) j++;
      push({ kind: "ident", value: text.slice(i, j), span: { start, end: j } });
      i = j;
      continue;
    }
    if (c === "<" && /[A-Za-z>]/.test(text[i + 1] ?? "") && jsxCanStart(tokens, nl)) {
      const end = scanJsx(text, i);
      if (end < 0) {
        diagnostics.push(err("L0006", "Unclosed JSX element: close it with `</tag>` or `/>`.", i, text.length));
        push({ kind: "jsx", value: text.slice(i), span: { start, end: text.length } });
        i = text.length;
      } else {
        push({ kind: "jsx", value: text.slice(i, end), span: { start, end } });
        i = end;
      }
      continue;
    }
    const p = PUNCT.find((op) => text.startsWith(op, i));
    if (p) {
      push({ kind: "punct", value: p, span: { start, end: i + p.length } });
      i += p.length;
      continue;
    }
    diagnostics.push(err("L0001", `Unexpected character \`${c}\`.`, i, i + 1));
    i++;
  }
  tokens.push({ kind: "eof", value: "", span: { start: text.length, end: text.length }, nl: true });
  return { tokens, comments, diagnostics };
}

/** Given the index of `{`, returns the index of its matching `}` (respecting strings, templates and comments), or -1. */
export function scanBlock(text: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    } else if (c === "'" || c === '"') {
      i++;
      while (i < text.length && text[i] !== c && text[i] !== "\n") i += text[i] === "\\" ? 2 : 1;
    } else if (c === "`") {
      i++;
      while (i < text.length && text[i] !== "`") {
        if (text[i] === "\\") i++;
        else if (text[i] === "$" && text[i + 1] === "{") {
          const end = scanBlock(text, i + 1);
          if (end < 0) return -1;
          i = end;
        }
        i++;
      }
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      if (end < 0) return -1;
      i = end + 1;
    }
    i++;
  }
  return -1;
}

/** A `<` starts JSX where a value is expected: first on a line, or after `(` `,` `:` `?` `=` `[` `=>` `&&` `||` `??`. Elsewhere it is less-than. */
function jsxCanStart(tokens: Token[], nl: boolean): boolean {
  const prev = tokens[tokens.length - 1];
  if (!prev || nl) return true;
  return prev.kind === "punct" && ["(", ",", ":", "?", "=", "[", "=>", "&&", "||", "??", ";"].includes(prev.value);
}

const JSX_NAME = /^[A-Za-z_$][\w$.:-]*/;

/** Skips a quoted string starting at `i`; returns the index after the closing quote, or -1. */
function skipQuoted(text: string, i: number): number {
  const q = text[i];
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === "\\") j++;
    else if (text[j] === q) return j + 1;
  }
  return -1;
}

/** Skips a LAYR call `Name(...)` or `a.B(...)` inside JSX children; returns the index after `)`, or -1. */
export function skipCall(text: string, i: number): number {
  let j = text.indexOf("(", i);
  let depth = 0;
  for (; j < text.length; j++) {
    const c = text[j];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return j + 1;
    } else if (c === "'" || c === '"' || c === "`") {
      const e = skipQuoted(text, j);
      if (e < 0) return -1;
      j = e - 1;
    } else if (c === "{") {
      const e = scanBlock(text, j);
      if (e < 0) return -1;
      j = e;
    } else if (c === "<" && /[A-Za-z>]/.test(text[j + 1] ?? "") && /[(,:?=[\s]/.test(text[j - 1] ?? "")) {
      const e = scanJsx(text, j);
      if (e < 0) return -1;
      j = e - 1;
    } else if (c === "/" && text[j + 1] === "/") {
      while (j < text.length && text[j] !== "\n") j++;
    }
  }
  return -1;
}

/** A LAYR object inside JSX children: `Name(` or `ns.Name(`, capitalised. */
export const LAYR_IN_JSX = /^(?:[a-z_$][\w$]*\.)?[A-Z][\w$]*\(/;

/**
 * Given the index of `<`, returns the index just after the element's end (`/>` or its closing tag),
 * or -1. Attribute values are strings or `{ }`; children are text, `{ }`, elements and LAYR objects.
 */
export function scanJsx(text: string, open: number): number {
  let i = open + 1;
  const name = text[i] === ">" ? "" : (JSX_NAME.exec(text.slice(i))?.[0] ?? "");
  i += name.length;
  // Attributes.
  for (;;) {
    while (/\s/.test(text[i] ?? "")) i++;
    if (i >= text.length) return -1;
    if (text.startsWith("/>", i)) return i + 2;
    if (text[i] === ">") {
      i++;
      break;
    }
    if (text[i] === "{") {
      const e = scanBlock(text, i);
      if (e < 0) return -1;
      i = e + 1;
      continue;
    }
    const attr = /^[\w$:.-]+/.exec(text.slice(i))?.[0];
    if (!attr) return -1;
    i += attr.length;
    while (/\s/.test(text[i] ?? "")) i++;
    if (text[i] !== "=") continue;
    i++;
    while (/\s/.test(text[i] ?? "")) i++;
    if (text[i] === '"' || text[i] === "'") {
      i = skipQuoted(text, i);
      if (i < 0) return -1;
    } else if (text[i] === "{") {
      const e = scanBlock(text, i);
      if (e < 0) return -1;
      i = e + 1;
    } else return -1;
  }
  // Children, up to this element's closing tag.
  while (i < text.length) {
    if (text.startsWith("</", i)) {
      const close = text.indexOf(">", i);
      return close < 0 ? -1 : close + 1;
    }
    const c = text[i] as string;
    if (c === "<" && /[A-Za-z>]/.test(text[i + 1] ?? "")) {
      const e = scanJsx(text, i);
      if (e < 0) return -1;
      i = e;
    } else if (c === "{") {
      const e = scanBlock(text, i);
      if (e < 0) return -1;
      i = e + 1;
    } else if (/[A-Za-z_$]/.test(c) && !/[\w$]/.test(text[i - 1] ?? "") && LAYR_IN_JSX.test(text.slice(i, i + 80))) {
      const e = skipCall(text, i);
      if (e < 0) return -1;
      i = e;
    } else i++;
  }
  return -1;
}

function err(code: string, message: string, start: number, end: number): Diagnostic {
  return { code, severity: "error", message, span: { start, end } };
}
