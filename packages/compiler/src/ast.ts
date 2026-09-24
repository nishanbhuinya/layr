import type { Span } from "./source.ts";

export interface Trivia {
  /** Comments on their own lines immediately before the node. */
  leading?: string[];
  /** A comment on the same line after the node. */
  trailing?: string;
  /** Own-line comments after the node, before the enclosing list closes. */
  after?: string[];
}

interface Base extends Trivia {
  span: Span;
}

// ---------------------------------------------------------------- items

/** `.name(...)`, `.name { ts }`, or `.name(...) { ts }` */
export interface Modifier extends Base {
  type: "Modifier";
  name: string;
  nameSpan: Span;
  items: Item[] | null;
  block: Block | null;
}

/** `key: value` (also named arguments such as `only(left: 20)`); `!mut key: value` in config. */
export interface Prop extends Base {
  type: "Prop";
  key: string;
  keySpan: Span;
  value: Expr;
  immutable: boolean;
  /** `.at(m, step h: 32)` */
  step: boolean;
}

export interface TypeRef extends Base {
  type: "TypeRef";
  name: string;
  args: TypeRef[];
  optional: boolean;
}

export type DeclKind = "var" | "const" | "bind" | "param" | "binding";

/**
 * `var int index = 0`, `const txt t = 'x'`, `bind txt l = '...'`, `!mut var int s = 1`,
 * params `req color color`, `len w = 200`, typed bindings `insets pad = card.padding`.
 */
export interface Decl extends Base {
  type: "Decl";
  kind: DeclKind;
  typeRef: TypeRef | null;
  name: string;
  nameSpan: Span;
  init: Expr | null;
  exported: boolean;
  immutable: boolean;
  required: boolean;
  ref: boolean;
}

export interface Block extends Base {
  type: "Block";
  /** Raw TypeScript between the braces. */
  code: string;
  /** Offset of the first character of `code` in the file. */
  codeStart: number;
}

export interface Import extends Base {
  type: "Import";
  source: string;
  defaultName: string | null;
  namespace: string | null;
  named: Array<{ name: string; alias: string }>;
  typeOnly: boolean;
}

export type Item = Modifier | Prop | Decl | Import | ExprItem;

export interface ExprItem extends Base {
  type: "ExprItem";
  expr: Expr;
}

// ---------------------------------------------------------------- expressions

export interface Ident extends Base {
  type: "Ident";
  name: string;
}

export interface NumberLit extends Base {
  type: "Number";
  value: number;
  /** '' | 'ds' | 'px' | '%' | 'fr' | 'ms' | 's' | 'deg' | 'hex' | ... */
  unit: string;
  raw: string;
}

export interface StringLit extends Base {
  type: "String";
  quote: string;
  /** Literal text parts interleaved with interpolated expressions. */
  parts: Array<string | Expr>;
  raw: string;
}

export interface ColorLit extends Base {
  type: "Color";
  hex: string;
}

export interface TupleLit extends Base {
  type: "Tuple";
  elements: Expr[];
}

export interface ListLit extends Base {
  type: "List";
  elements: Expr[];
}

export interface Member extends Base {
  type: "Member";
  object: Expr;
  name: string;
  nameSpan: Span;
  optional: boolean;
}

export interface Index extends Base {
  type: "Index";
  object: Expr;
  index: Expr;
}

/** Any call: widget node, value constructor, Function call, method call. Classified by the resolver. */
export interface Call extends Base {
  type: "Call";
  callee: Expr;
  items: Item[];
  /** Trailing `{ ts }` directly after the call, e.g. `.fnc(calc) { ... }` is a Modifier; this is for `Foo(...) { }` (rare). */
  block: Block | null;
}

export interface Unary extends Base {
  type: "Unary";
  op: "!" | "-" | "+" | "++" | "--";
  argument: Expr;
}

export interface Update extends Base {
  type: "Update";
  op: "++" | "--";
  argument: Expr;
}

export interface NonNull extends Base {
  type: "NonNull";
  argument: Expr;
}

export interface Binary extends Base {
  type: "Binary";
  op: string;
  left: Expr;
  right: Expr;
}

export interface Ternary extends Base {
  type: "Ternary";
  test: Expr;
  consequent: Expr;
  alternate: Expr;
}

export interface Assign extends Base {
  type: "Assign";
  op: "=" | "+=" | "-=" | "*=" | "/=" | "??=";
  target: Expr;
  value: Expr;
}

export interface Paren extends Base {
  type: "Paren";
  expr: Expr;
}

/** `(a, b) => expr` or `a => expr`: a function value (callbacks such as `list.filter((a) => a.done)`). */
export interface Arrow extends Base {
  type: "Arrow";
  params: Array<{ name: string; span: Span }>;
  body: Expr;
}

/** A leading-dot reference inside an expression position, e.g. `.obj(.obj)` (forward the caller's obj). */
export interface DotRef extends Base {
  type: "DotRef";
  name: string;
}

export interface Missing extends Base {
  type: "Missing";
}

export type Expr =
  | Ident
  | NumberLit
  | StringLit
  | ColorLit
  | TupleLit
  | ListLit
  | Member
  | Index
  | Call
  | Unary
  | Update
  | NonNull
  | Binary
  | Ternary
  | Assign
  | Paren
  | Arrow
  | DotRef
  | Block
  | Missing;

export interface FileNode {
  type: "File";
  items: Item[];
  span: Span;
  /** Comments at the end of the file that belong to no item. */
  dangling?: string[];
}

export type Node = FileNode | Item | Expr | TypeRef;
