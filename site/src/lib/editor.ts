/**
 * The site's LAYR editor (CodeMirror): the language, its colours, and one editor factory shared by
 * the playground and every editable docs example. Mod-S and Mod-Enter run.
 */
import { history as editHistory, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, HighlightStyle, indentOnInput, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { type Diagnostic as CmDiagnostic, linter, lintGutter } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import type { Compiled } from "./runner.ts";

const KEYWORDS = new Set(["var", "const", "bind", "req", "import", "from", "export", "true", "false", "null", "if", "else", "return", "await", "let", "for", "while"]);

export const layrLanguage = StreamLanguage.define<{ block: number }>({
  name: "layr",
  startState: () => ({ block: 0 }),
  token(stream, state) {
    if (stream.eatSpace()) return null;
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match("/*")) {
      while (!stream.eol() && !stream.match("*/")) stream.next();
      return "comment";
    }
    if (stream.match(/^'(?:[^'\\]|\\.)*'?/) || stream.match(/^"(?:[^"\\]|\\.)*"?/)) return "string";
    if (stream.match(/^#[0-9a-fA-F]{3,8}\b/)) return "color";
    if (stream.match(/^!mut\b/)) return "keyword";
    if (stream.match(/^<\/?[A-Za-z][\w$.:-]*/) || stream.match(/^<\/?>/) || stream.match(/^\/>/)) return "tag";
    if (stream.match(/^\d+(\.\d+)?(ds|px|%|fr|ms|s|deg|vw|vh|dvh)?/)) return "number";
    if (stream.match(/^\.[a-zA-Z_]\w*/)) return "modifier";
    if (stream.match(/^[A-Z]\w*/)) return "widget";
    if (stream.match(/^[a-z_]\w*(?=\s*:)/)) return "property";
    const w = stream.match(/^[a-z_$][\w$]*/) as RegExpMatchArray | null;
    if (w) return KEYWORDS.has(w[0]) ? "keyword" : "variable";
    if (stream.match(/^[{}]/)) {
      state.block += stream.current() === "{" ? 1 : -1;
      return "brace";
    }
    stream.next();
    return "punctuation";
  },
  tokenTable: { tag: t.tagName, widget: t.typeName, modifier: t.function(t.propertyName), property: t.propertyName, color: t.color, brace: t.brace },
});

export const layrHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "var(--code-keyword)" },
  { tag: t.comment, color: "var(--code-comment)", fontStyle: "italic" },
  { tag: t.string, color: "var(--code-string)" },
  { tag: [t.number, t.color], color: "var(--code-constant)" },
  { tag: t.typeName, color: "var(--code-function)" },
  { tag: t.tagName, color: "var(--code-keyword)" },
  { tag: t.function(t.propertyName), color: "var(--code-type)" },
  { tag: t.propertyName, color: "var(--code-param)" },
  { tag: t.variableName, color: "var(--code-fg)" },
  { tag: [t.punctuation, t.brace], color: "var(--code-punct)" },
]);

/**
 * A LAYR editor in `parent`. `lint` supplies the latest compile of the editor's text (its
 * diagnostics show inline); `onRun` fires on Mod-S / Mod-Enter; `onChange` on every edit.
 */
export function createEditor(opts: { parent: HTMLElement; doc: string; onChange: (text: string) => void; onRun: () => void; lint: () => Compiled | null; label?: string; extra?: Extension[] }): EditorView {
  const run = () => {
    opts.onRun();
    return true;
  };
  return new EditorView({
    parent: opts.parent,
    state: EditorState.create({
      doc: opts.doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        editHistory(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        layrLanguage,
        syntaxHighlighting(layrHighlight),
        lintGutter(),
        linter(
          (v) => {
            const c = opts.lint();
            if (!c) return [];
            const doc = v.state.doc;
            return c.diagnostics
              .filter((d) => d.severity !== "info")
              .map((d): CmDiagnostic => {
                const from = Math.min(d.span.start, doc.length);
                return { from, to: Math.max(from, Math.min(d.span.end, doc.length)), severity: d.severity === "error" ? "error" : "warning", message: `${d.code}: ${d.message}` };
              });
          },
          { delay: 350 },
        ),
        keymap.of([{ key: "Mod-s", preventDefault: true, run }, { key: "Mod-Enter", preventDefault: true, run }, indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) opts.onChange(u.state.doc.toString());
        }),
        EditorView.contentAttributes.of({ "aria-label": opts.label ?? "LAYR source" }),
        ...(opts.extra ?? []),
      ],
    }),
  });
}
