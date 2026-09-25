/**
 * A live docs example: the result, and under it the code that made it, editable in place. Change
 * anything and press Run (Ctrl/Cmd+S): the snippet compiles in this browser and runs in the real,
 * resizable viewport above. Reset brings back the original. Loads only when scrolled near.
 */
import type { EditorView } from "@codemirror/view";
import { ArrowCounterClockwise, ArrowSquareOut, Check, Copy, Play } from "@phosphor-icons/react/ssr";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Compiled, compile } from "../lib/runner.ts";
import { wrapSnippet } from "../lib/snippet.ts";
import { FrameChips, useRunner, Viewport } from "./stage.tsx";

const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** The snippet's diagnostics, with offsets moved from the running code back onto the snippet. */
function onSnippet(c: Compiled, src: string): Compiled {
  const w = wrapSnippet(src);
  if (!w) return c;
  const diagnostics = c.diagnostics.flatMap((d) => {
    const start = w.toSnippet(d.span.start);
    const end = w.toSnippet(d.span.end);
    return start === null ? [] : [{ ...d, span: { start, end: end ?? start } }];
  });
  return { ...c, diagnostics };
}

export function Live({ code, codeHtml, playground, src }: { code: string; codeHtml: string; playground: string; src?: string }) {
  const original = src ?? code;
  const box = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const [visible, setVisible] = useState(false);
  const [room, setRoom] = useState(640);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [text, setText] = useState(original);
  const [runSrc, setRunSrc] = useState(original);
  const [editor, setEditor] = useState(false);
  const [copied, setCopied] = useState(false);
  const runCode = runSrc === original ? code : (wrapSnippet(runSrc)?.run ?? runSrc);
  const run = useRunner(runCode, visible);
  const lint = useRef<Compiled | null>(null);
  const edited = text !== runSrc;
  const changed = runSrc !== original || text !== original;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisible(true), { rootMargin: "900px" });
    io.observe(el);
    const ro = new ResizeObserver(() => setRoom(Math.max(160, el.clientWidth)));
    ro.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  const doRun = useCallback(() => {
    const t = view.current?.state.doc.toString() ?? text;
    setText(t);
    if (t === runSrc) run.rerun();
    else setRunSrc(t);
  }, [text, runSrc, run.rerun]);
  const runRef = useRef(doRun);
  runRef.current = doRun;

  // The editor loads with the example, replacing the static code in place.
  useEffect(() => {
    if (!visible || !host.current || view.current) return;
    let alive = true;
    void import("../lib/editor.ts").then(({ createEditor }) => {
      if (!alive || !host.current) return;
      host.current.textContent = "";
      view.current = createEditor({ parent: host.current, doc: original, onChange: setText, onRun: () => runRef.current(), lint: () => lint.current, label: "Example source, editable" });
      setEditor(true);
    });
    return () => {
      alive = false;
    };
  }, [visible, original]);
  useEffect(() => () => view.current?.destroy(), []);

  // Diagnostics as you type, shown in the editor.
  useEffect(() => {
    if (!editor || text === original) {
      lint.current = null;
      return;
    }
    let alive = true;
    const id = setTimeout(() => {
      const w0 = wrapSnippet(text);
      void compile(w0?.run ?? text).then((c) => {
        if (alive) lint.current = onSnippet(c, text);
      });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [text, editor, original]);

  const reset = () => {
    view.current?.dispatch({ changes: { from: 0, to: view.current.state.doc.length, insert: original } });
    setText(original);
    setRunSrc(original);
  };

  const error = run.compiled?.errors ? (run.compiled.diagnostics.find((d) => d.severity === "error")?.message ?? "Compile error") : run.runtimeError;

  return (
    <div className="live-box" ref={box}>
      <div className="live-bar" aria-label="Example">
        <span className="live-title">Result</span>
        <span className="spacer" />
        <FrameChips stageW={room} w={w} h={h} setW={setW} setH={setH} />
        <a className="live-open" href={playground} title="Open in playground">
          <ArrowSquareOut size={15} />
          <span>Playground</span>
        </a>
      </div>
      <Viewport frame={run.frame} onLoad={run.onLoad} ready={run.ready} visible={visible} stageW={room} contentH={run.height} w={w} h={h} setW={setW} setH={setH} loading={!run.ran && !error}>
        {error ? <p className="live-error">{error}</p> : null}
      </Viewport>
      <div className="live-edit">
        <div className="live-edit-bar">
          <span className="live-title">Code</span>
          <span className="live-hint">{editor ? "Edit it, then run" : ""}</span>
          <span className="spacer" />
          {changed ? (
            <button type="button" className="live-btn" onClick={reset} title="Back to the original">
              <ArrowCounterClockwise size={14} /> Reset
            </button>
          ) : null}
          <button
            type="button"
            className="live-btn"
            data-done={copied ? "" : undefined}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(view.current?.state.doc.toString() ?? text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              } catch {}
            }}
          >
            {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
          </button>
          {editor ? (
            <button type="button" className="live-btn primary" onClick={doRun} data-edited={edited ? "" : undefined} title={`Run (${mac ? "⌘" : "Ctrl"}+S)`}>
              <Play size={13} weight="fill" /> Run
              <span className="play-keys" aria-hidden="true">
                <kbd>{mac ? "⌘" : "Ctrl"}</kbd>
                <kbd>S</kbd>
              </span>
            </button>
          ) : null}
        </div>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: build-time highlighted source, replaced by the editor once it loads */}
        <div className="live-code live-editor" ref={host} dangerouslySetInnerHTML={{ __html: codeHtml }} />
      </div>
    </div>
  );
}
