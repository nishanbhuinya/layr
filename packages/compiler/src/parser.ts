import type {
  Block,
  Call,
  Decl,
  DeclKind,
  Expr,
  ExprItem,
  FileNode,
  Import,
  Item,
  Modifier,
  Prop,
  StringLit,
  TypeRef,
} from "./ast.ts";
import { type Comment, lex, type Token } from "./lexer.ts";
import type { Diagnostic, Span } from "./source.ts";

export interface ParseResult {
  file: FileNode;
  diagnostics: Diagnostic[];
}

const BINARY: Record<string, number> = {
  "??": 1,
  "||": 2,
  "&&": 3,
  "==": 4,
  "!=": 4,
  "===": 4,
  "!==": 4,
  "<": 5,
  ">": 5,
  "<=": 5,
  ">=": 5,
  "+": 6,
  "-": 6,
  "*": 7,
  "/": 7,
  "%": 7,
};

const ASSIGN = new Set(["=", "+=", "-=", "*=", "/=", "??="]);
const DECL_WORDS = new Set(["var", "const", "bind"]);

export function parse(text: string, offset = 0): ParseResult {
  const p = new Parser(text, offset);
  return { file: p.parseFile(), diagnostics: p.diagnostics };
}

/** Parses a single expression (used for `${...}` interpolation and tooling). */
export function parseExpression(text: string, offset = 0): { expr: Expr; diagnostics: Diagnostic[] } {
  const p = new Parser(text, offset);
  const expr = p.parseExpr();
  return { expr, diagnostics: p.diagnostics };
}

class Parser {
  readonly diagnostics: Diagnostic[] = [];
  private tokens: Token[];
  private comments: Comment[];
  private ci = 0;
  private pos = 0;
  /** Nesting depth of expression-level brackets, where line breaks do not end expressions. */
  private exprDepth = 0;

  private readonly text: string;
  private readonly offset: number;

  constructor(text: string, offset: number) {
    this.text = text;
    this.offset = offset;
    const r = lex(text);
    this.tokens = r.tokens;
    this.comments = r.comments;
    for (const d of r.diagnostics) this.diagnostics.push(this.shift(d));
    if (offset) {
      for (const t of this.tokens) t.span = { start: t.span.start + offset, end: t.span.end + offset };
      for (const c of this.comments) c.span = { start: c.span.start + offset, end: c.span.end + offset };
    }
  }

  private shift(d: Diagnostic): Diagnostic {
    return this.offset ? { ...d, span: { start: d.span.start + this.offset, end: d.span.end + this.offset } } : d;
  }

  // ------------------------------------------------------------ token helpers

  private get t(): Token {
    return this.tokens[this.pos] as Token;
  }

  private peek(n = 1): Token {
    return (this.tokens[this.pos + n] ?? this.tokens[this.tokens.length - 1]) as Token;
  }

  private next(): Token {
    const t = this.t;
    if (t.kind !== "eof") this.pos++;
    return t;
  }

  private is(value: string, t: Token = this.t): boolean {
    return (t.kind === "punct" || t.kind === "ident") && t.value === value;
  }

  private eat(value: string): Token | null {
    if (this.is(value)) return this.next();
    return null;
  }

  private expect(value: string, code = "L0010"): Token {
    const t = this.eat(value);
    if (t) return t;
    this.error(code, `Expected \`${value}\` but found ${describe(this.t)}.`, this.t.span);
    return { kind: "punct", value, span: { start: this.t.span.start, end: this.t.span.start }, nl: false };
  }

  private error(code: string, message: string, span: Span) {
    const last = this.diagnostics[this.diagnostics.length - 1];
    if (last && last.span.start === span.start && last.code === code) return;
    this.diagnostics.push({ code, severity: "error", message, span });
  }

  private prevEnd(): number {
    return (this.tokens[this.pos - 1]?.span.end ?? this.offset) as number;
  }

  // ------------------------------------------------------------ comments

  private leadingComments(before: number): string[] | undefined {
    const out: string[] = [];
    while (this.ci < this.comments.length && (this.comments[this.ci] as Comment).span.end <= before) {
      out.push((this.comments[this.ci] as Comment).text);
      this.ci++;
    }
    return out.length ? out : undefined;
  }

  private trailingComment(after: number): string | undefined {
    const c = this.comments[this.ci];
    if (!c || c.ownLine) return undefined;
    const between = this.text.slice(after - this.offset, c.span.start - this.offset);
    if (between.includes("\n")) return undefined;
    this.ci++;
    return c.text;
  }

  // ------------------------------------------------------------ items

  parseFile(): FileNode {
    const items = this.parseItems("eof", true);
    const dangling = this.leadingComments(Number.POSITIVE_INFINITY);
    const file: FileNode = { type: "File", items, span: { start: this.offset, end: this.offset + this.text.length } };
    if (dangling) file.dangling = dangling;
    return file;
  }

  /** Items until `close` (`)` or eof). Items are separated by line breaks, `,` or `;`. */
  private parseItems(close: ")" | "eof", topLevel = false): Item[] {
    const items: Item[] = [];
    const saved = this.exprDepth;
    this.exprDepth = 0;
    while (true) {
      const t = this.t;
      if (t.kind === "eof" || (close === ")" && this.is(")"))) break;
      if (this.eat(",") || this.eat(";")) continue;
      const leading = this.leadingComments(t.span.start);
      const start = this.pos;
      const item = this.parseItem(topLevel);
      if (leading) item.leading = leading;
      if (this.pos === start) {
        // No progress: skip the offending token.
        this.error("L0011", `Unexpected ${describe(this.t)}.`, this.t.span);
        this.next();
        continue;
      }
      items.push(item);
      const sep = this.t;
      if (this.is(",") || this.is(";")) {
        this.next();
        const tc = this.t.nl || this.t.kind === "eof" ? this.trailingComment(this.prevEnd()) : undefined;
        if (tc) item.trailing = tc;
      } else {
        const tc = sep.nl || sep.kind === "eof" ? this.trailingComment(item.span.end) : undefined;
        if (tc) item.trailing = tc;
        if (!sep.nl && sep.kind !== "eof" && !(close === ")" && this.is(")")) && !this.startsModifier() && item.type !== "Modifier") {
          this.error("L0012", `Expected a line break or \`,\` before ${describe(sep)}.`, sep.span);
        }
      }
    }
    // Comments before the closing paren belong after the last item.
    const closeAt = this.t.span.start;
    const rest: string[] = [];
    while (this.ci < this.comments.length && (this.comments[this.ci] as Comment).span.end <= closeAt) {
      rest.push((this.comments[this.ci] as Comment).text);
      this.ci++;
    }
    if (rest.length) {
      const last = items[items.length - 1];
      if (last) last.after = rest;
      else if (close === ")") items.push({ type: "ExprItem", expr: { type: "Missing", span: { start: closeAt, end: closeAt } }, span: { start: closeAt, end: closeAt }, leading: rest });
    }
    this.exprDepth = saved;
    return items;
  }

  private startsModifier(): boolean {
    return this.is(".") && this.peek().kind === "ident";
  }

  private parseItem(topLevel: boolean): Item {
    const t = this.t;
    if (topLevel && this.is("import") && (this.peek().kind !== "punct" || this.is("*", this.peek()))) return this.parseImport();
    if (this.startsModifier() && (this.is("(", this.peek(2)) || this.peek(2).kind === "block")) return this.parseModifier();
    const decl = this.tryDecl();
    if (decl) return decl;
    // `!mut key: value` / `step key: value`
    if (this.is("!") && this.is("mut", this.peek()) && this.peek(2).kind === "ident" && this.is(":", this.peek(3))) {
      this.next();
      this.next();
      return this.parseProp(true, false, t.span.start);
    }
    if (this.is("step") && this.peek().kind === "ident" && this.is(":", this.peek(2))) {
      this.next();
      return this.parseProp(false, true, t.span.start);
    }
    if (t.kind === "ident" && this.is(":", this.peek())) return this.parseProp(false, false, t.span.start);
    const expr = this.parseExpr();
    const item: ExprItem = { type: "ExprItem", expr, span: expr.span };
    return item;
  }

  private parseProp(immutable: boolean, step: boolean, start: number): Prop {
    const key = this.next();
    this.next(); // ':'
    const value = this.parseExpr();
    return { type: "Prop", key: key.value, keySpan: key.span, value, immutable, step, span: { start, end: value.span.end } };
  }

  private parseModifier(): Modifier {
    const dot = this.next();
    const name = this.next();
    let items: Item[] | null = null;
    let end = name.span.end;
    if (this.is("(")) {
      this.next();
      items = this.parseItems(")");
      end = this.expect(")").span.end;
    }
    let block: Block | null = null;
    if (this.t.kind === "block" && (!this.t.nl || items === null)) {
      block = this.blockFrom(this.next());
      end = block.span.end;
    }
    return { type: "Modifier", name: name.value, nameSpan: name.span, items, block, span: { start: dot.span.start, end } };
  }

  private blockFrom(t: Token): Block {
    return { type: "Block", code: t.value, codeStart: t.span.start + 1, span: t.span };
  }

  /** Declarations: `[export] [!mut] (var|const|bind) type name [= init]`, params `[req] [ref] [!mut] type name [= init]`, typed bindings `type name = init`. */
  private tryDecl(): Decl | null {
    const save = this.pos;
    const start = this.t.span.start;
    let exported = false;
    let immutable = false;
    let required = false;
    let ref = false;
    let kind: DeclKind | null = null;
    for (;;) {
      if (this.is("export") && this.peek().kind === "ident") {
        exported = true;
        this.next();
      } else if (this.is("!") && this.is("mut", this.peek()) && this.peek(2).kind === "ident" && !this.is(":", this.peek(3))) {
        immutable = true;
        this.next();
        this.next();
      } else if (this.is("req") && this.peek().kind === "ident") {
        required = true;
        kind = "param";
        this.next();
      } else if (this.is("ref") && this.peek().kind === "ident" && this.peek(2).kind === "ident") {
        ref = true;
        kind = "param";
        this.next();
      } else break;
    }
    if (this.t.kind === "ident" && DECL_WORDS.has(this.t.value) && this.peek().kind === "ident") {
      kind = this.next().value as DeclKind;
    }
    // type name
    if (this.t.kind !== "ident" || !this.looksLikeTypeThenName()) {
      if (kind || exported || immutable || required || ref) {
        // `var index = 0` without a type is allowed: the type is inferred.
        if (kind && this.t.kind === "ident" && (this.is("=", this.peek()) || this.peek().nl || this.is(")", this.peek()))) {
          const name = this.next();
          const init = this.eat("=") ? this.parseExpr() : null;
          return this.decl(kind, null, name, init, { exported, immutable, required, ref }, start);
        }
        this.pos = save;
      }
      this.pos = save;
      return null;
    }
    const typeRef = this.parseTypeRef();
    const name = this.next();
    const init = this.eat("=") ? this.parseExpr() : null;
    return this.decl(kind ?? "binding", typeRef, name, init, { exported, immutable, required, ref }, start);
  }

  private decl(
    kind: DeclKind,
    typeRef: TypeRef | null,
    name: Token,
    init: Expr | null,
    f: { exported: boolean; immutable: boolean; required: boolean; ref: boolean },
    start: number,
  ): Decl {
    return {
      type: "Decl",
      kind,
      typeRef,
      name: name.value,
      nameSpan: name.span,
      init,
      exported: f.exported,
      immutable: f.immutable,
      required: f.required,
      ref: f.ref,
      span: { start, end: init ? init.span.end : name.span.end },
    };
  }

  /** At an identifier: is this `Type name` (optionally `Type<..>`, `Type?`) with the name on the same line? */
  private looksLikeTypeThenName(): boolean {
    let i = this.pos + 1;
    const tk = (n: number) => this.tokens[n] as Token;
    if (tk(i).kind === "punct" && tk(i).value === "<") {
      let depth = 0;
      for (; i < this.tokens.length; i++) {
        const x = tk(i);
        if (x.kind === "punct" && x.value === "<") depth++;
        else if (x.kind === "punct" && x.value === ">") {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        } else if (!(x.kind === "ident" || (x.kind === "punct" && (x.value === "," || x.value === "?")))) return false;
      }
    }
    if (tk(i).kind === "punct" && tk(i).value === "?") i++;
    const name = tk(i);
    if (name.kind !== "ident" || name.nl) return false;
    const after = tk(i + 1);
    if (after.kind === "punct" && (after.value === "(" || after.value === ":" || after.value === ".")) return false;
    return true;
  }

  private parseTypeRef(): TypeRef {
    const name = this.next();
    const args: TypeRef[] = [];
    if (this.eat("<")) {
      do args.push(this.parseTypeRef());
      while (this.eat(","));
      this.expect(">");
    }
    const optional = !!this.eat("?");
    return { type: "TypeRef", name: name.value, args, optional, span: { start: name.span.start, end: this.prevEnd() } };
  }

  private parseImport(): Import {
    const start = this.next().span.start; // import
    const imp: Import = { type: "Import", source: "", defaultName: null, namespace: null, named: [], typeOnly: false, span: { start, end: start } };
    // Side-effect import: `import 'pkg'`.
    if (this.t.kind === "string") {
      const src = this.next();
      imp.source = src.value;
      imp.span = { start, end: src.span.end };
      return imp;
    }
    if (this.is("type") && this.peek().kind !== "punct") {
      imp.typeOnly = true;
      this.next();
    }
    if (this.t.kind === "ident" && !this.is("from")) {
      imp.defaultName = this.next().value;
      this.eat(",");
    }
    if (this.eat("*")) {
      this.expect("as");
      imp.namespace = this.next().value;
    } else if (this.t.kind === "block") {
      const b = this.next();
      for (const part of b.value.split(",")) {
        const m = part.trim().match(/^(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
        if (m) imp.named.push({ name: m[1] as string, alias: (m[2] ?? m[1]) as string });
        else if (part.trim()) this.error("L0013", `Invalid import specifier \`${part.trim()}\`.`, b.span);
      }
    }
    this.expect("from");
    const src = this.next();
    if (src.kind !== "string") this.error("L0013", "Expected a module path string after `from`.", src.span);
    imp.source = src.kind === "string" ? src.value : "";
    imp.span = { start, end: src.span.end };
    return imp;
  }

  // ------------------------------------------------------------ expressions

  parseExpr(): Expr {
    return this.parseAssign();
  }

  private canContinue(): boolean {
    return this.exprDepth > 0 || !this.t.nl;
  }

  private parseAssign(): Expr {
    const left = this.parseTernary();
    if (this.t.kind === "punct" && ASSIGN.has(this.t.value) && this.canContinue()) {
      const op = this.next().value as "=";
      const value = this.parseAssign();
      return { type: "Assign", op, target: left, value, span: { start: left.span.start, end: value.span.end } };
    }
    return left;
  }

  private parseTernary(): Expr {
    const test = this.parseBinary(1);
    if (this.is("?") && this.canContinue()) {
      this.next();
      const consequent = this.parseAssign();
      this.expect(":");
      const alternate = this.parseAssign();
      return { type: "Ternary", test, consequent, alternate, span: { start: test.span.start, end: alternate.span.end } };
    }
    return test;
  }

  private parseBinary(minPrec: number): Expr {
    let left = this.parseUnary();
    for (;;) {
      const t = this.t;
      const prec = t.kind === "punct" ? BINARY[t.value] : undefined;
      if (prec === undefined || prec < minPrec || !this.canContinue()) break;
      this.next();
      const right = this.parseBinary(prec + 1);
      left = { type: "Binary", op: t.value, left, right, span: { start: left.span.start, end: right.span.end } };
    }
    return left;
  }

  private parseUnary(): Expr {
    const t = this.t;
    if (t.kind === "punct" && (t.value === "!" || t.value === "-" || t.value === "+" || t.value === "++" || t.value === "--")) {
      this.next();
      const argument = this.parseUnary();
      return { type: "Unary", op: t.value as "!", argument, span: { start: t.span.start, end: argument.span.end } };
    }
    return this.parsePostfix(this.parsePrimary());
  }

  private parsePostfix(expr: Expr): Expr {
    for (;;) {
      const t = this.t;
      if (t.nl && this.exprDepth === 0) return expr;
      if (this.is(".") && this.peek().kind === "ident") {
        this.next();
        const name = this.next();
        expr = { type: "Member", object: expr, name: name.value, nameSpan: name.span, optional: false, span: { start: expr.span.start, end: name.span.end } };
      } else if (this.is("?.") && this.peek().kind === "ident") {
        this.next();
        const name = this.next();
        expr = { type: "Member", object: expr, name: name.value, nameSpan: name.span, optional: true, span: { start: expr.span.start, end: name.span.end } };
      } else if (this.is("(")) {
        this.next();
        const items = this.parseItems(")");
        const close = this.expect(")");
        let block: Block | null = null;
        let end = close.span.end;
        if (this.t.kind === "block" && !this.t.nl) {
          block = this.blockFrom(this.next());
          end = block.span.end;
        }
        expr = { type: "Call", callee: expr, items, block, span: { start: expr.span.start, end } } satisfies Call;
      } else if (this.is("[")) {
        this.next();
        this.exprDepth++;
        const index = this.parseExpr();
        this.exprDepth--;
        const close = this.expect("]");
        expr = { type: "Index", object: expr, index, span: { start: expr.span.start, end: close.span.end } };
      } else if (this.is("!") && !this.is("mut", this.peek())) {
        const bang = this.next();
        expr = { type: "NonNull", argument: expr, span: { start: expr.span.start, end: bang.span.end } };
      } else if (this.is("++") || this.is("--")) {
        const op = this.next();
        expr = { type: "Update", op: op.value as "++", argument: expr, span: { start: expr.span.start, end: op.span.end } };
      } else return expr;
    }
  }

  private parsePrimary(): Expr {
    const t = this.t;
    switch (t.kind) {
      case "ident":
        this.next();
        if (this.is("=>")) return this.arrowBody([{ name: t.value, span: t.span }], t.span.start);
        return { type: "Ident", name: t.value, span: t.span };
      case "number":
        this.next();
        return { type: "Number", value: t.num as number, unit: t.unit ?? "", raw: t.value, span: t.span };
      case "color":
        this.next();
        return { type: "Color", hex: t.value, span: t.span };
      case "string":
        this.next();
        return this.stringLit(t);
      case "block":
        this.next();
        return this.blockFrom(t);
      case "punct":
        if (t.value === "(") return this.parseParenOrTuple();
        if (t.value === "[") {
          this.next();
          this.exprDepth++;
          const elements: Expr[] = [];
          while (!this.is("]") && this.t.kind !== "eof") {
            elements.push(this.parseExpr());
            if (!this.eat(",")) break;
          }
          this.exprDepth--;
          const close = this.expect("]");
          return { type: "List", elements, span: { start: t.span.start, end: close.span.end } };
        }
        if (t.value === "." && this.peek().kind === "ident") {
          this.next();
          const name = this.next();
          return { type: "DotRef", name: name.value, span: { start: t.span.start, end: name.span.end } };
        }
        break;
    }
    this.error("L0014", `Expected a value but found ${describe(t)}.`, t.span);
    return { type: "Missing", span: { start: t.span.start, end: t.span.start } };
  }

  private parseParenOrTuple(): Expr {
    const open = this.next();
    this.exprDepth++;
    const elements: Expr[] = [];
    let comma = false;
    while (!this.is(")") && this.t.kind !== "eof") {
      elements.push(this.parseExpr());
      if (this.eat(",")) comma = true;
      else break;
    }
    this.exprDepth--;
    const close = this.expect(")");
    const span = { start: open.span.start, end: close.span.end };
    if (this.is("=>")) {
      const params = elements.map((e) => (e.type === "Ident" ? { name: e.name, span: e.span } : null));
      if (params.every((p) => p !== null)) return this.arrowBody(params as Array<{ name: string; span: Span }>, open.span.start);
      this.error("L0014", "Arrow function parameters are plain names: `(a, b) => ...`.", span);
    }
    if (!comma && elements.length === 1) return { type: "Paren", expr: elements[0] as Expr, span };
    return { type: "Tuple", elements, span };
  }

  private arrowBody(params: Array<{ name: string; span: Span }>, start: number): Expr {
    this.next(); // =>
    this.exprDepth++;
    const body = this.parseExpr();
    this.exprDepth--;
    return { type: "Arrow", params, body, span: { start, end: body.span.end } };
  }

  private stringLit(t: Token): StringLit {
    const raw = t.value;
    const parts: Array<string | Expr> = [];
    const base = t.span.start + 1;
    let buf = "";
    let i = 0;
    while (i < raw.length) {
      const c = raw[i] as string;
      if (c === "\\" && i + 1 < raw.length) {
        const n = raw[i + 1] as string;
        buf += n === "n" ? "\n" : n === "t" ? "\t" : n;
        i += 2;
        continue;
      }
      if (c === "$" && raw[i + 1] === "{") {
        let depth = 0;
        let j = i + 1;
        for (; j < raw.length; j++) {
          if (raw[j] === "{") depth++;
          else if (raw[j] === "}") {
            depth--;
            if (depth === 0) break;
          }
        }
        if (buf) parts.push(buf);
        buf = "";
        const sub = new Parser(raw.slice(i + 2, j), base + i + 2);
        sub.exprDepth = 1;
        parts.push(sub.parseExpr());
        for (const d of sub.diagnostics) this.diagnostics.push(d);
        i = j + 1;
        continue;
      }
      if (c === "$" && /[A-Za-z_]/.test(raw[i + 1] ?? "")) {
        let j = i + 1;
        while (j < raw.length && /[A-Za-z0-9_]/.test(raw[j] as string)) j++;
        if (buf) parts.push(buf);
        buf = "";
        parts.push({ type: "Ident", name: raw.slice(i + 1, j), span: { start: base + i + 1, end: base + j } });
        i = j;
        continue;
      }
      buf += c;
      i++;
    }
    if (buf || parts.length === 0) parts.push(buf);
    return { type: "String", quote: t.quote ?? "'", parts, raw, span: t.span };
  }
}

function describe(t: Token): string {
  if (t.kind === "eof") return "end of file";
  if (t.kind === "block") return "`{`";
  if (t.kind === "string") return "a string";
  return `\`${t.value}\``;
}
