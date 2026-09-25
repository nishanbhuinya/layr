/**
 * How a docs snippet runs. A snippet that declares a Page runs as written; a lone object (or a few)
 * is placed in a small page with room around it. The snippet is kept verbatim inside the wrapper,
 * so an offset in the running code maps straight back to the snippet the reader edits.
 */
const DEFINITIONS = /^(Widget|Function|App|Preset|Inject|Extract|Export|Theme|DesignScale|var|const|bind)\b/m;

export interface Wrapped {
  /** The code to compile and run. */
  run: string;
  /** Maps an offset in `run` to the snippet's own text (null inside the wrapper). */
  toSnippet: (offset: number) => number | null;
}

export function wrapSnippet(code: string): Wrapped | null {
  if (/\bPage\s*\(/.test(code)) return { run: code, toSnippet: (o) => o };
  // Leading imports stay at the top of the file; the rest goes inside the page.
  const m = /^(?:\s*import\b[^\n]*\n|\s*\n)*/.exec(code);
  const head = m ? m[0] : "";
  const rest = code.slice(head.length);
  if (DEFINITIONS.test(rest) || !/^\s*[A-Z<][\w.]*/.test(rest)) return null;
  const prefix = "Page(\n.name(Preview)\n.route('/')\nScaffold(.config(color: canvas) .body(Column(\n.config(w: fill, padding: all(24), gap: 16)\n";
  const suffix = "\n)))\n)\n";
  const run = `${head}${prefix}${rest}${suffix}`;
  const start = head.length + prefix.length;
  return {
    run,
    toSnippet: (o) => (o < head.length ? o : o < start || o > start + rest.length ? null : o - prefix.length),
  };
}
