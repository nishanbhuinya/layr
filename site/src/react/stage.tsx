/**
 * The shared machinery behind every live preview (docs examples, the playground, widget pages):
 * a runner frame that executes compiled LAYR, and a resizable window around it. The window is a
 * real viewport: dragging its corner changes what the page lays out against.
 */
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { type Compiled, compile, currentTheme } from "../lib/runner.ts";

/** The reader's palette (a named or custom theme): the frame does not inherit the page's styles. */
function palette(): string {
  return document.getElementById("layr-palette")?.textContent ?? "";
}

export const MIN_W = 320;
/** The canvas around a resized window. */
export const CANVAS_PAD = 20;
/** Target spacing of the canvas dots; the real spacing divides the stage exactly. */
const DOT = 14;

/**
 * The dot canvas, laid out so a whole number of cells fits each way and every dot sits in the
 * middle of its cell: the gap from each edge to the first dot is the same on all four sides.
 */
function dots(width: number, height: number): React.CSSProperties {
  const sx = width / Math.max(1, Math.round(width / DOT));
  const sy = height / Math.max(1, Math.round(height / DOT));
  // The gradient draws each dot at its tile's centre, so tiles from the corner give equal edges.
  return { backgroundSize: `${sx}px ${sy}px`, backgroundPosition: "0 0" };
}
export const MAX_W = 1440;
export const MIN_H = 120;
export const MAX_H = 1200;

/** Design frames previews compile with (the default Design Scale). */
export const BANDS = [
  { name: "m", from: 0, w: 390 },
  { name: "t", from: 600, w: 834 },
  { name: "w", from: 1024, w: 1440 },
  { name: "uw", from: 1920, w: 2560 },
];

export function frameOf(width: number): string {
  return [...BANDS].reverse().find((b) => width >= b.from)?.name ?? "m";
}

/** Compiles `code` and runs it in the frame once both are ready. */
export function useRunner(code: string, active = true, opts: { inspect?: boolean; transparent?: boolean; app?: string } = {}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(160);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  // Counts completed runs, so a view over the page can re-attach to each fresh render.
  const [runs, setRuns] = useState(0);
  const [compiled, setCompiled] = useState<Compiled | null>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === "ready") setReady(true);
      if (e.data?.type === "size") setHeight(Math.max(64, e.data.h as number));
      if (e.data?.type === "error") setRuntimeError(e.data.message as string);
      if (e.data?.type === "ran") {
        setRuntimeError(null);
        setRan(true);
        setRuns((n) => n + 1);
      }
    };
    addEventListener("message", onMsg);
    return () => removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    void compile(code, opts).then((c) => {
      if (alive) setCompiled(c);
    });
    return () => {
      alive = false;
    };
  }, [code, active, opts.inspect, opts.app]);

  // The page inside follows the site's theme, including a choice made while it is open.
  useEffect(() => {
    const send = () => frame.current?.contentWindow?.postMessage({ type: "theme", theme: currentTheme() ?? null, palette: palette() }, location.origin);
    const mo = new MutationObserver(send);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    addEventListener("layr-theme", send);
    return () => {
      mo.disconnect();
      removeEventListener("layr-theme", send);
    };
  }, []);

  useEffect(() => {
    if (!ready || !compiled || compiled.errors) return;
    frame.current?.contentWindow?.postMessage({ type: "run", js: compiled.js, css: compiled.css, modules: compiled.modules, aliases: compiled.aliases, theme: currentTheme(), palette: palette(), transparent: !!opts.transparent }, location.origin);
  }, [ready, compiled, opts.transparent]);

  const onLoad = useCallback(() => setReady(true), []);
  /** Runs the current code again from a fresh page (its state starts over). */
  const rerun = useCallback(() => {
    if (!compiled || compiled.errors) return;
    frame.current?.contentWindow?.postMessage({ type: "run", js: compiled.js, css: compiled.css, modules: compiled.modules, aliases: compiled.aliases, theme: currentTheme(), palette: palette(), transparent: !!opts.transparent }, location.origin);
  }, [compiled, opts.transparent]);
  return { frame, onLoad, ready, height, runtimeError, compiled, ran, runs, rerun };
}

/**
 * The resizable window: a clipped real viewport and a curved grip on its bottom-right corner.
 * `w`/`h` of 0 mean "fit the room" and "grow with the content".
 */
export function Viewport({
  frame,
  onLoad,
  ready,
  visible,
  stageW,
  contentH,
  w,
  h,
  setW,
  setH,
  maxShownH = 720,
  fillHeight = 0,
  loading = false,
  overlay,
  children,
}: {
  frame: React.RefObject<HTMLIFrameElement | null>;
  onLoad: () => void;
  ready: boolean;
  visible: boolean;
  /** The stage's inner width: the window fills it at "fit". */
  stageW: number;
  contentH: number;
  w: number;
  h: number;
  setW: (v: number) => void;
  setH: (v: number) => void;
  maxShownH?: number;
  /** At "fit", use this height as the viewport (the playground fills its pane). */
  fillHeight?: number;
  /** Until the page has rendered, the window shows a calm loading state instead of an empty box. */
  loading?: boolean;
  /** Drawn over the page, in the window's own coordinates (the page's CSS px times `scale`). */
  overlay?: (scale: number) => ReactNode;
  children?: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  // At "fit" the window is the pane, edge to edge; resized, it sits centred on the canvas.
  const fit = w === 0 && h === 0;
  const pad = fit ? 0 : CANVAS_PAD;
  const room = Math.max(160, stageW - 2 * pad);
  const width = w || Math.round(stageW);
  const scale = Math.min(1, room / width);
  const name = frameOf(width);
  const fixedH = h || (fit && fillHeight ? Math.max(MIN_H, Math.round(fillHeight)) : 0);
  const shown = fixedH || Math.min(contentH, maxShownH);
  const viewportH = fixedH || Math.max(900, contentH);
  // A pane that owns its height (the playground) keeps the canvas full height and centres the
  // window in it; elsewhere the canvas is the window plus its margin.
  const stageH = Math.max(fillHeight, shown * scale + 2 * pad);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "height", auto: fixedH === 0 }, location.origin);
  }, [fixedH, frame, ready]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const y0 = e.clientY;
    const w0 = width;
    const h0 = shown;
    const s0 = scale;
    setDragging(true);
    const move = (ev: PointerEvent) => {
      setW(Math.round(Math.min(MAX_W, Math.max(MIN_W, w0 + (ev.clientX - x0) / s0))));
      setH(Math.round(Math.min(MAX_H, Math.max(MIN_H, h0 + (ev.clientY - y0) / s0))));
    };
    const up = () => {
      setDragging(false);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 80 : 16;
    if (e.key === "ArrowRight") setW(Math.min(MAX_W, width + step));
    else if (e.key === "ArrowLeft") setW(Math.max(MIN_W, width - step));
    else if (e.key === "ArrowDown") setH(Math.min(MAX_H, shown + step));
    else if (e.key === "ArrowUp") setH(Math.max(MIN_H, shown - step));
    else if (e.key === "Escape") {
      setW(0);
      setH(0);
    } else return;
    e.preventDefault();
  };

  return (
    <div
      className="live-stage"
      data-fit={fit ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
      style={{ height: stageH, padding: pad, ...(fit ? {} : dots(stageW, stageH)) }}
    >
      <div className="live-window" style={{ width: width * scale, height: shown * scale }}>
        <div className="live-clip" data-loading={loading ? "" : undefined}>
          {visible ? (
            <iframe
              ref={frame}
              src="/run.html"
              title="Live example"
              onLoad={onLoad}
              style={{ width, height: viewportH, transform: scale < 1 ? `scale(${scale})` : undefined, pointerEvents: dragging ? "none" : undefined }}
            />
          ) : null}
        </div>
        {overlay ? <div className="live-overlay">{overlay(scale)}</div> : null}
        <Arc fit={fit} w={width * scale} h={shown * scale} />
        <button
          type="button"
          className="live-grip"
          aria-label={`Resize the preview: ${width} by ${shown} pixels, frame ${name}. Arrow keys resize, Escape resets.`}
          title="Drag to resize. Double-click to reset."
          onPointerDown={onPointerDown}
          onKeyDown={onKey}
          onDoubleClick={() => {
            setW(0);
            setH(0);
          }}
        />
        {dragging ? (
          <span className="live-badge">
            {width} × {shown} · {name}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** Corner radii the arc follows: the resized window's own corner, or the box's inner corner at "fit". */
const WINDOW_R = 10;
const BOX_R = 17;
const GAP = 4;
const STROKE = 5;

/**
 * The resize grip's visual: a soft arc with round caps, concentric with the corner it hugs
 * (outside a resized window, inside the box at "fit"). Frosted white over a soft shadow at rest,
 * so it reads on any surface; lit with the site's light on hover and while dragging.
 */
function Arc({ fit, w, h }: { fit: boolean; w: number; h: number }) {
  const r = fit ? BOX_R : WINDOW_R;
  const rc = fit ? r - GAP - STROKE / 2 : r + GAP + STROKE / 2;
  const size = rc + STROKE * 2;
  const d = `M ${rc} 0 A ${rc} ${rc} 0 0 1 0 ${rc}`;
  return (
    <svg className="live-arc" aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ left: w - r, top: h - r }}>
      <defs>
        <linearGradient id="arc-light" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ff6a3d" />
          <stop offset="0.55" stopColor="#ffc46b" />
          <stop offset="1" stopColor="#9b8cff" />
        </linearGradient>
      </defs>
      <path className="arc-shade" d={d} />
      <path className="arc-glass" d={d} />
      <path className="arc-lit" d={d} />
    </svg>
  );
}

/** Size readout and frame chips for a toolbar. */
export function FrameChips({ stageW, w, h, setW, setH }: { stageW: number; w: number; h: number; setW: (v: number) => void; setH: (v: number) => void }) {
  const width = w || Math.round(stageW);
  const name = frameOf(width);
  return (
    <>
      <span className="live-readout" aria-live="polite">
        {h ? `${width} × ${h}` : `${width}px`} <b>{name}</b>
      </span>
      <div className="live-frames" role="group" aria-label="Design frame">
        <button
          type="button"
          aria-pressed={w === 0 && h === 0}
          onClick={() => {
            setW(0);
            setH(0);
          }}
          title="Fit the space, grow with the content"
        >
          fit
        </button>
        {BANDS.slice(0, 3).map((f) => (
          <button key={f.name} type="button" aria-pressed={w !== 0 && name === f.name} onClick={() => setW(f.w)} title={`${f.name}: ${f.w}px wide`}>
            {f.name}
          </button>
        ))}
      </div>
    </>
  );
}
