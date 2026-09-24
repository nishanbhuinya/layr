/**
 * LAYR-TS: TypeScript bodies inside `{ }`. Adds LAYR literals (`200ds`, `12px`, `100ms`, `#fff`,
 * `await 100ms`) and makes LAYR state feel like plain variables: reading a state reads its signal,
 * assigning writes it, and writing another object's feature (`box.w = 200`) is an imperative Inject.
 */
import { parse as babelParse } from "@babel/parser";
import MagicString from "magic-string";

export type BindingKind =
  | "signal" // var / ref param: .get() / .set()
  | "computed" // bind: .get(), read-only
  | "value" // const, param, import: unchanged
  | "object"; // an object id: member reads/writes become feature reads/writes

export interface BodyScope {
  /** Resolves a free identifier in the body. Returns null when unknown (left as is). */
  lookup(name: string): { kind: BindingKind; code: string; address?: string } | null;
}

export interface BodyResult {
  code: string;
  isAsync: boolean;
  usesContext: boolean;
  errors: Array<{ message: string; offset: number }>;
  /** Objects written imperatively: address + feature, for the E/E/I graph. */
  writes: Array<{ address: string; key: string; offset: number }>;
  reads: Array<{ address: string; key: string; offset: number }>;
  hooks: string[];
}

const UNIT_RE = /(^|[^\w$.])(\d+(?:\.\d+)?)(ds|px|ms|s|deg|%)(?![\w$])/g;

/** Replaces LAYR literals with JS so the body parses as TypeScript. Lengths keep their offsets where possible. */
export function preprocess(code: string): string {
  let out = "";
  let i = 0;
  const n = code.length;
  const flushPlain = (end: number) => {
    let seg = code.slice(i, end);
    seg = seg.replace(UNIT_RE, (_m, pre: string, num: string, unit: string) => {
      switch (unit) {
        case "ds":
          return `${pre}${num}`;
        case "px":
          return `${pre}$V.px(${num})`;
        case "%":
          return `${pre}$V.pct(${num})`;
        case "ms":
          return `${pre}${num}`;
        case "s":
          return `${pre}${Number(num) * 1000}`;
        case "deg":
          return `${pre}${num}`;
        default:
          return `${pre}${num}`;
      }
    });
    seg = seg.replace(/(^|[^\w$&#])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w$])/g, (_m, pre: string, hex: string) => `${pre}$V.Color.hex("#${hex.toLowerCase()}")`);
    out += seg;
    i = end;
  };
  while (i < n) {
    let j = i;
    // advance to next string/comment/template start
    while (j < n) {
      const c = code[j];
      if (c === "'" || c === '"' || c === "`" || (c === "/" && (code[j + 1] === "/" || code[j + 1] === "*"))) break;
      j++;
    }
    flushPlain(j);
    if (j >= n) break;
    const c = code[j] as string;
    let k = j + 1;
    if (c === "/" && code[j + 1] === "/") {
      while (k < n && code[k] !== "\n") k++;
    } else if (c === "/" && code[j + 1] === "*") {
      const e = code.indexOf("*/", j + 2);
      k = e < 0 ? n : e + 2;
    } else {
      while (k < n && code[k] !== c) {
        if (code[k] === "\\") k++;
        k++;
      }
      k++;
    }
    out += code.slice(j, k);
    i = k;
  }
  return out;
}

type AnyNode = { type: string; start: number; end: number; [k: string]: unknown };

const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ObjectMethod", "ClassMethod"]);
const SKIP_KEYS = new Set(["loc", "start", "end", "extra", "leadingComments", "trailingComments", "innerComments", "typeAnnotation", "returnType", "typeParameters", "range"]);

/**
 * Rewrites a body. `mode` is "statements" for `.def { }` / `.fnc { }` / `.react { }` and
 * "expression" for a single expression.
 */
export function rewriteBody(source: string, scope: BodyScope, mode: "statements" | "expression" = "statements"): BodyResult {
  const pre = preprocess(source);
  const result: BodyResult = { code: pre, isAsync: false, usesContext: false, errors: [], writes: [], reads: [], hooks: [] };
  const wrapped = mode === "expression" ? `(${pre})` : pre;
  const offset = mode === "expression" ? 1 : 0;
  let ast: { program: AnyNode };
  try {
    ast = babelParse(wrapped, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      errorRecovery: true,
    }) as unknown as { program: AnyNode };
  } catch (e) {
    const err = e as { message: string; pos?: number };
    result.errors.push({ message: err.message, offset: Math.max(0, (err.pos ?? 0) - offset) });
    return result;
  }
  const errs = (ast as unknown as { errors?: Array<{ message: string; pos: number }> }).errors ?? [];
  for (const e of errs) result.errors.push({ message: e.message, offset: Math.max(0, e.pos - offset) });

  const ms = new MagicString(wrapped);
  const scopes: Array<Set<string>> = [new Set()];
  const declared = (name: string) => scopes.some((s) => s.has(name));
  const declare = (name: string) => (scopes[scopes.length - 1] as Set<string>).add(name);

  const declarePattern = (p: AnyNode | null | undefined) => {
    if (!p) return;
    if (p.type === "Identifier") declare(p.name as string);
    else if (p.type === "ObjectPattern") for (const prop of p.properties as AnyNode[]) declarePattern((prop.type === "RestElement" ? prop.argument : prop.value) as AnyNode);
    else if (p.type === "ArrayPattern") for (const el of p.elements as AnyNode[]) declarePattern(el);
    else if (p.type === "AssignmentPattern") declarePattern(p.left as AnyNode);
    else if (p.type === "RestElement") declarePattern(p.argument as AnyNode);
    else if (p.type === "TSParameterProperty") declarePattern(p.parameter as AnyNode);
  };

  // Hoist declarations of a block so earlier references resolve to locals.
  const hoist = (body: AnyNode[]) => {
    for (const st of body) {
      if (st.type === "VariableDeclaration") for (const dcl of st.declarations as AnyNode[]) declarePattern(dcl.id as AnyNode);
      else if ((st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") && st.id) declare((st.id as AnyNode).name as string);
      else if (st.type === "ImportDeclaration") for (const sp of st.specifiers as AnyNode[]) declare((sp.local as AnyNode).name as string);
    }
  };

  const text = (n: AnyNode) => ms.slice(n.start, n.end);

  /** The free identifier at the root of a member chain, if any. */
  const rootIdent = (n: AnyNode): AnyNode | null => {
    let cur = n;
    while (cur.type === "MemberExpression" || cur.type === "OptionalMemberExpression" || cur.type === "TSNonNullExpression") {
      cur = (cur.type === "TSNonNullExpression" ? cur.expression : cur.object) as AnyNode;
    }
    return cur.type === "Identifier" ? cur : null;
  };

  const binding = (name: string) => (declared(name) ? null : scope.lookup(name));

  const visit = (node: AnyNode | null | undefined, parent: AnyNode | null, key: string | null): void => {
    if (!node || typeof node.type !== "string") return;
    const t = node.type;

    if (t === "AwaitExpression") {
      result.isAsync = true;
      const arg = node.argument as AnyNode;
      if (arg.type === "NumericLiteral") {
        result.usesContext = true;
        ms.overwrite(node.start, node.end, `await $ctx.wait(${text(arg)})`);
        return;
      }
    }

    if (FUNCTION_TYPES.has(t)) {
      scopes.push(new Set());
      if (t !== "ArrowFunctionExpression" && t !== "ObjectMethod" && t !== "ClassMethod" && node.id) declare((node.id as AnyNode).name as string);
      for (const p of (node.params as AnyNode[]) ?? []) declarePattern(p);
      const body = node.body as AnyNode;
      if (body.type === "BlockStatement") hoist(body.body as AnyNode[]);
      for (const p of (node.params as AnyNode[]) ?? []) visitPatternDefaults(p);
      visit(body, node, "body");
      scopes.pop();
      return;
    }
    if (t === "BlockStatement" || t === "Program" || t === "StaticBlock") {
      scopes.push(new Set());
      hoist(node.body as AnyNode[]);
      for (const st of node.body as AnyNode[]) visit(st, node, "body");
      scopes.pop();
      return;
    }
    if (t === "CatchClause") {
      scopes.push(new Set());
      declarePattern(node.param as AnyNode);
      visit(node.body as AnyNode, node, "body");
      scopes.pop();
      return;
    }
    if (t === "ForStatement" || t === "ForInStatement" || t === "ForOfStatement") {
      scopes.push(new Set());
      const init = (node.init ?? node.left) as AnyNode | null;
      if (init?.type === "VariableDeclaration") for (const dcl of init.declarations as AnyNode[]) declarePattern(dcl.id as AnyNode);
      for (const k of ["init", "left", "right", "test", "update", "body"]) visit(node[k] as AnyNode, node, k);
      scopes.pop();
      return;
    }
    if (t === "VariableDeclarator") {
      declarePattern(node.id as AnyNode);
      visitPatternDefaults(node.id as AnyNode);
      visit(node.init as AnyNode, node, "init");
      return;
    }

    // Assignments to LAYR state or object features.
    if (t === "AssignmentExpression") {
      const left = node.left as AnyNode;
      const op = node.operator as string;
      if (left.type === "Identifier") {
        const b = binding(left.name as string);
        if (b?.kind === "signal") {
          visit(node.right as AnyNode, node, "right");
          const rhs = text(node.right as AnyNode);
          const value = op === "=" ? rhs : `${b.code}.get() ${op.slice(0, -1)} (${rhs})`;
          ms.overwrite(node.start, node.end, `${b.code}.set(${value})`);
          return;
        }
        if (b?.kind === "computed") result.errors.push({ message: `\`${left.name}\` is a bind and cannot be assigned.`, offset: left.start - offset });
      } else if (left.type === "MemberExpression" && !left.computed) {
        const root = rootIdent(left);
        const b = root ? binding(root.name as string) : null;
        if (b?.kind === "object" && (left.object as AnyNode) === root) {
          visit(node.right as AnyNode, node, "right");
          const prop = (left.property as AnyNode).name as string;
          const rhs = text(node.right as AnyNode);
          const value = op === "=" ? rhs : `$.read(${JSON.stringify(b.address)}, ${JSON.stringify(prop)}) ${op.slice(0, -1)} (${rhs})`;
          result.writes.push({ address: b.address as string, key: prop, offset: left.start - offset });
          ms.overwrite(node.start, node.end, `$.write(${JSON.stringify(b.address)}, ${JSON.stringify(prop)}, ${value})`);
          return;
        }
      }
    }
    if (t === "UpdateExpression") {
      const arg = node.argument as AnyNode;
      if (arg.type === "Identifier") {
        const b = binding(arg.name as string);
        if (b?.kind === "signal") {
          const delta = node.operator === "++" ? "1" : "-1";
          ms.overwrite(node.start, node.end, `$.bump(${b.code}, ${delta}, ${node.prefix ? "true" : "false"})`);
          return;
        }
      } else if (arg.type === "MemberExpression" && !arg.computed) {
        const root = rootIdent(arg);
        const b = root ? binding(root.name as string) : null;
        if (b?.kind === "object" && (arg.object as AnyNode) === root) {
          const prop = (arg.property as AnyNode).name as string;
          result.writes.push({ address: b.address as string, key: prop, offset: arg.start - offset });
          const delta = node.operator === "++" ? "1" : "-1";
          ms.overwrite(node.start, node.end, `$.write(${JSON.stringify(b.address)}, ${JSON.stringify(prop)}, $.add($.read(${JSON.stringify(b.address)}, ${JSON.stringify(prop)}), ${delta}))`);
          return;
        }
      }
    }

    if (t === "MemberExpression" && !node.computed) {
      const obj = node.object as AnyNode;
      if (obj.type === "Identifier") {
        const b = binding(obj.name as string);
        if (b?.kind === "object") {
          const prop = (node.property as AnyNode).name as string;
          result.reads.push({ address: b.address as string, key: prop, offset: obj.start - offset });
          ms.overwrite(node.start, node.end, `$.read(${JSON.stringify(b.address)}, ${JSON.stringify(prop)})`);
          return;
        }
      }
    }

    if (t === "Identifier") {
      // Only references: skip property keys and member properties.
      if (parent) {
        if ((parent.type === "MemberExpression" || parent.type === "OptionalMemberExpression") && key === "property" && !parent.computed) return;
        if ((parent.type === "ObjectProperty" || parent.type === "ObjectMethod") && key === "key" && !parent.computed) {
          if (parent.shorthand && parent.type === "ObjectProperty") {
            const b = binding(node.name as string);
            if (b && (b.kind === "signal" || b.kind === "computed")) ms.overwrite(parent.start, parent.end, `${node.name}: ${b.code}.get()`);
            else if (b && b.code !== node.name) ms.overwrite(parent.start, parent.end, `${node.name}: ${b.code}`);
          }
          return;
        }
        if (parent.type === "LabeledStatement" || parent.type === "BreakStatement" || parent.type === "ContinueStatement") return;
      }
      const name = node.name as string;
      if (/^use[A-Z]/.test(name) && parent?.type === "CallExpression" && key === "callee") result.hooks.push(name);
      const b = binding(name);
      if (!b) return;
      if (b.kind === "signal" || b.kind === "computed") ms.overwrite(node.start, node.end, `${b.code}.get()`);
      else if (b.code !== name) ms.overwrite(node.start, node.end, b.code);
      return;
    }

    for (const k of Object.keys(node)) {
      if (SKIP_KEYS.has(k)) continue;
      const v = node[k];
      if (Array.isArray(v)) {
        for (const c of v) if (c && typeof c === "object" && typeof (c as AnyNode).type === "string") visit(c as AnyNode, node, k);
      } else if (v && typeof v === "object" && typeof (v as AnyNode).type === "string") visit(v as AnyNode, node, k);
    }
  };

  const visitPatternDefaults = (p: AnyNode | null | undefined) => {
    if (!p) return;
    if (p.type === "AssignmentPattern") visit(p.right as AnyNode, p, "right");
    else if (p.type === "ObjectPattern") for (const prop of p.properties as AnyNode[]) visitPatternDefaults((prop.type === "RestElement" ? prop.argument : prop.value) as AnyNode);
    else if (p.type === "ArrayPattern") for (const el of p.elements as AnyNode[]) visitPatternDefaults(el);
  };

  const program = ast.program;
  hoist(program.body as AnyNode[]);
  for (const st of program.body as AnyNode[]) visit(st, program, "body");

  let code = ms.toString();
  if (mode === "expression") code = code.slice(1, -1);
  result.code = code;
  return result;
}
