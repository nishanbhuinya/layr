/**
 * The playground: LAYR in a CodeMirror editor, compiled in the browser as you type, run in a real
 * resizable viewport, with the compiled CSS and React module and every diagnostic beside it. The
 * code lives in the URL hash, so a link is a share.
 */
import type { EditorView } from "@codemirror/view";
import { ArrowCounterClockwise, Check, Info, MagicWand, Play, ShareNetwork, Warning, WarningCircle } from "@phosphor-icons/react/ssr";
import examples from "virtual:site/examples";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Compiled, compile, loadCompiler } from "../lib/runner.ts";
import { FrameChips, useRunner, Viewport } from "./stage.tsx";

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
  /** On a narrow screen one pane shows at a time. */
  const [pane, setPane] = useState<"code" | "preview">("code");
  // `code` is what runs (set by Run, Ctrl+S or picking an example); `pending` is the editor's text,
  // compiled as you type for its diagnostics only.
  const run = useRunner(code, true);
  const [linted, setLinted] = useState<Compiled | null>(null);
  const compiled: Compiled | null = linted ?? run.compiled;
  const lintRef = useRef<Compiled | null>(null);
  lintRef.current = compiled;
  const edited = pending !== code;

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

  // The editor (CodeMirror loads with it, not with the page).
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => {
    let alive = true;
    let v: EditorView | null = null;
    void import("../lib/editor.ts").then(({ createEditor }) => {
      if (!alive || !host.current) return;
      v = createEditor({ parent: host.current, doc: pendingRef.current, onChange: setPending, onRun: () => runRef.current(), lint: () => lintRef.current });
      view.current = v;
    });
    return () => {
      alive = false;
      v?.destroy();
    };
  }, []);

  // Check as you type, after a short pause; running waits for Run.
  useEffect(() => {
    let alive = true;
    const id = setTimeout(() => {
      void compile(pending).then((c) => {
        if (alive) setLinted(c);
      });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [pending]);

  const runNow = useCallback(() => {
    const text = view.current?.state.doc.toString() ?? pending;
    if (text === code) run.rerun();
    else setCode(text);
    setPane("preview");
  }, [pending, code, run.rerun]);
  const runRef = useRef(runNow);
  runRef.current = runNow;

  // Ctrl+S / Cmd+S runs, wherever the focus is on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        runRef.current();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

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

  const runErrors = run.compiled?.errors ?? 0;
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="play" data-pane={pane}>
      <div className="play-switch" role="tablist" aria-label="Show">
        <button type="button" role="tab" aria-selected={pane === "code"} onClick={() => setPane("code")}>
          Code
          {errors ? <span className="count" data-err="">{errors}</span> : null}
        </button>
        <button type="button" role="tab" aria-selected={pane === "preview"} onClick={() => (edited ? runNow() : setPane("preview"))}>
          Preview
          {edited ? <span className="play-dot" title="Edited since the last run" /> : null}
        </button>
      </div>
      <section aria-label="Editor" className="play-code">
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
            <MagicWand size={15} /> <span className="play-btn-text">Format</span>
          </button>
          <button type="button" className="play-btn" onClick={() => load((examples.find((x: { id: string }) => x.id === example) ?? examples[0])?.code ?? "")} title="Back to the example">
            <ArrowCounterClockwise size={15} /> <span className="play-btn-text">Reset</span>
          </button>
          <button type="button" className="play-btn" onClick={() => void share()} title="Copy a link that carries this code">
            {shared ? <Check size={15} /> : <ShareNetwork size={15} />} <span className="play-btn-text">{shared ? "Link copied" : "Share"}</span>
          </button>
          <button type="button" className="play-btn primary play-run" onClick={runNow} title={`Run (${mac ? "⌘" : "Ctrl"}+S)`} data-edited={edited ? "" : undefined}>
            <Play size={14} weight="fill" /> Run
            <span className="play-keys" aria-hidden="true">
              <kbd>{mac ? "⌘" : "Ctrl"}</kbd>
              <kbd>S</kbd>
            </span>
          </button>
        </div>
        <div className="play-editor" ref={host} />
      </section>
      <section aria-label="Output" className="play-output">
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
            {runErrors ? (
              <p className="live-error">
                {runErrors} error{runErrors === 1 ? "" : "s"}: the preview shows the last version that compiled. See Problems.
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
