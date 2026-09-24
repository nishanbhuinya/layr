/**
 * The playground: LAYR in a CodeMirror editor, compiled in the browser as you type, run in a real
 * resizable viewport, with the compiled CSS and React module and every diagnostic beside it. The
 * code lives in the URL hash, so a link is a share.
 */
import { history as editHistory, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, HighlightStyle, indentOnInput, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { type Diagnostic as CmDiagnostic, linter, lintGutter } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { ArrowCounterClockwise, Check, Info, MagicWand, ShareNetwork, Warning, WarningCircle } from "@phosphor-icons/react/ssr";
import examples from "virtual:site/examples";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Compiled, loadCompiler } from "../lib/runner.ts";
import { FrameChips, useRunner, Viewport } from "./stage.tsx";

// ------------------------------------------------------------------ the LAYR language for CodeMirror

const KEYWORDS = new Set(["var", "const", "bind", "req", "import", "from", "export", "true", "false", "null", "if", "else", "return", "await", "let", "for", "while"]);

const layrLanguage = StreamLanguage.define<{ block: number }>({
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
  tokenTable: { widget: t.typeName, modifier: t.function(t.propertyName), property: t.propertyName, color: t.color, brace: t.brace },
});

const layrHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "var(--code-keyword)" },
  { tag: t.comment, color: "var(--code-comment)", fontStyle: "italic" },
  { tag: t.string, color: "var(--code-string)" },
  { tag: [t.number, t.color], color: "var(--code-constant)" },
  { tag: t.typeName, color: "var(--code-function)" },
  { tag: t.function(t.propertyName), color: "var(--code-type)" },
  { tag: t.propertyName, color: "var(--code-param)" },
  { tag: t.variableName, color: "var(--code-fg)" },
  { tag: [t.punctuation, t.brace], color: "var(--code-punct)" },
]);

// ------------------------------------------------------------------ sharing through the URL

async function pack(code: string): Promise<string> {
  const stream = new Blob([code]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function unpack(s: string): Promise<string> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

// ------------------------------------------------------------------ the component

type Tab = "preview" | "css" | "js" | "problems";

export function Playground() {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState<string>((examples[0]?.code as string) ?? "");
  const [pending, setPending] = useState(code);
  const [tab, setTab] = useState<Tab>("preview");
  const [room, setRoom] = useState(640);
  const [paneH, setPaneH] = useState(0);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [shared, setShared] = useState(false);
  const [example, setExample] = useState<string>(examples[0]?.id ?? "");
  const run = useRunner(code, true);
  const compiled: Compiled | null = run.compiled;
  const lintRef = useRef<Compiled | null>(null);
  lintRef.current = compiled;

  // Load shared code from the hash.
  useEffect(() => {
    const m = location.hash.match(/code=([\w-]+)/);
    if (!m) return;
    void unpack(m[1] as string)
      .then((c) => {
        setExample("");
        setCode(c);
        setPending(c);
        view.current?.dispatch({ changes: { from: 0, to: view.current.state.doc.length, insert: c } });
      })
      .catch(() => {});
  }, []);

  // The editor.
  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: pending,
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
            () => {
              const c = lintRef.current;
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
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) setPending(u.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ "aria-label": "LAYR source" }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compile as you type, after a short pause.
  useEffect(() => {
    const id = setTimeout(() => setCode(pending), 300);
    return () => clearTimeout(id);
  }, [pending]);

  useEffect(() => {
    const el = stageBox.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setRoom(Math.max(160, el.clientWidth));
      setPaneH(el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const load = useCallback((c: string) => {
    view.current?.dispatch({ changes: { from: 0, to: view.current.state.doc.length, insert: c } });
    setPending(c);
    setCode(c);
    history.replaceState(null, "", location.pathname);
  }, []);

  const format = useCallback(async () => {
    const c = await loadCompiler();
    const r = c.format(pending, { width: 80 });
    if (!r.errors && r.changed) load(r.text);
  }, [pending, load]);

  const share = useCallback(async () => {
    const url = `${location.origin}${location.pathname}#code=${await pack(pending)}`;
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
    setShared(true);
    setTimeout(() => setShared(false), 1800);
  }, [pending]);

  const problems = useMemo(() => (compiled?.diagnostics ?? []).filter((d) => d.severity !== "info"), [compiled]);
  const errors = problems.filter((d) => d.severity === "error").length;
  const jump = (offset: number) => {
    const v = view.current;
    if (!v) return;
    v.dispatch({ selection: { anchor: offset }, scrollIntoView: true });
    v.focus();
  };

  return (
    <div className="play">
      <section aria-label="Editor">
        <div className="play-bar">
          <select
            aria-label="Examples"
            value={example}
            onChange={(e) => {
              setExample(e.target.value);
              const ex = examples.find((x: { id: string }) => x.id === e.target.value);
              if (ex) load(ex.code);
            }}
          >
            {example === "" ? <option value="">Shared code</option> : null}
            {examples.map((x: { id: string; title: string }) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
          <span className="spacer" />
          <button type="button" className="play-btn" onClick={() => void format()} title="Rewrite in canonical form (layr format)">
            <MagicWand size={15} /> Format
          </button>
          <button type="button" className="play-btn" onClick={() => load((examples.find((x: { id: string }) => x.id === example) ?? examples[0])?.code ?? "")} title="Back to the example">
            <ArrowCounterClockwise size={15} /> Reset
          </button>
          <button type="button" className="play-btn primary" onClick={() => void share()}>
            {shared ? <Check size={15} /> : <ShareNetwork size={15} />} {shared ? "Link copied" : "Share"}
          </button>
        </div>
        <div className="play-editor" ref={host} />
      </section>
      <section aria-label="Output">
        <div className="play-bar" role="tablist" aria-label="Output">
          {(
            [
              ["preview", "Preview"],
              ["css", "CSS"],
              ["js", "React module"],
              ["problems", "Problems"],
            ] as Array<[Tab, string]>
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" className="play-tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
              {id === "problems" ? (
                <span className="count" data-err={errors ? "" : undefined}>
                  {problems.length}
                </span>
              ) : null}
            </button>
          ))}
          <span className="spacer" />
          {tab === "preview" ? <FrameChips stageW={room} w={w} h={h} setW={setW} setH={setH} /> : null}
        </div>
        <div className="play-out" ref={stageBox} hidden={tab !== "preview"}>
          <Viewport frame={run.frame} onLoad={run.onLoad} ready={run.ready} visible stageW={room} contentH={run.height} w={w} h={h} setW={setW} setH={setH} maxShownH={4000} fillHeight={paneH}>
            {errors ? (
              <p className="live-error">
                {errors} error{errors === 1 ? "" : "s"}: the preview shows the last version that compiled. See Problems.
              </p>
            ) : run.runtimeError ? (
              <p className="live-error">{run.runtimeError}</p>
            ) : null}
          </Viewport>
        </div>
        <div className="play-out" hidden={tab !== "css"}>
          <pre className="console">{compiled?.css.split("\n").slice(-400).join("\n") ?? ""}</pre>
        </div>
        <div className="play-out" hidden={tab !== "js"}>
          <pre className="console">{compiled?.js ?? ""}</pre>
        </div>
        <div className="play-out" hidden={tab !== "problems"}>
          {problems.length ? (
            problems.map((d) => (
              <button key={`${d.code}-${d.span.start}`} type="button" className="problem" data-sev={d.severity} onClick={() => jump(d.span.start)}>
                {d.severity === "error" ? <WarningCircle size={16} weight="fill" /> : d.severity === "warning" ? <Warning size={16} weight="fill" /> : <Info size={16} />}
                <span>
                  {d.message}
                  <code>
                    {d.code} at {d.line}:{d.column}
                  </code>
                </span>
              </button>
            ))
          ) : (
            <p className="play-empty">No problems. Every diagnostic has a page in the reference, and layr explain prints it in your terminal.</p>
          )}
        </div>
      </section>
    </div>
  );
}
