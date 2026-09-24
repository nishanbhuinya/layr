/**
 * The home page's inspector: a real, prerendered LAYR page in an iframe (so it has a true viewport
 * at every design frame), inspected the way devtools inspects any page. Every label is read from
 * the live document: `data-l` (widget), `data-path` and `data-line` (emitted by `inspect: true`),
 * computed boxes, and the page's own `--ds`.
 */
import { ArrowsHorizontal, Cursor, Play } from "@phosphor-icons/react/ssr";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface Frame {
  name: string;
  w: number;
}

interface Picked {
  widget: string;
  path: string;
  line: number;
  box: { x: number; y: number; w: number; h: number };
  margin: [number, number, number, number];
  border: [number, number, number, number];
  padding: [number, number, number, number];
  gaps: Array<{ x: number; y: number; w: number; h: number }>;
  rows: Array<[string, string]>;
}

/** Where each design frame starts (mirrors src/app.layr). */
const BANDS = [
  { name: "m", from: 0 },
  { name: "t", from: 600 },
  { name: "w", from: 1024 },
  { name: "xl", from: 1280 },
  { name: "uw", from: 1920 },
];
/** The stage shows the whole demo page, between these heights (px on screen). */
const STAGE_MIN = 260;
const STAGE_MAX = 560;
const MIN_W = 320;
const MAX_W = 1440;

function px(v: string): number {
  return Number.parseFloat(v) || 0;
}

function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function measure(el: HTMLElement, ds: number): Picked {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const four = (p: string, suffix = ""): [number, number, number, number] => [px(cs.getPropertyValue(`${p}-top${suffix}`)), px(cs.getPropertyValue(`${p}-right${suffix}`)), px(cs.getPropertyValue(`${p}-bottom${suffix}`)), px(cs.getPropertyValue(`${p}-left${suffix}`))];
  const gaps: Picked["gaps"] = [];
  const flex = cs.display.includes("flex") && cs.flexWrap === "nowrap";
  if (flex && px(cs.columnGap || cs.gap) + px(cs.rowGap) > 0) {
    const kids = [...el.children].filter((c) => getComputedStyle(c).display !== "none").map((c) => c.getBoundingClientRect());
    const row = cs.flexDirection.startsWith("row");
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1] as DOMRect;
      const b = kids[i] as DOMRect;
      if (row && b.left > a.right) gaps.push({ x: a.right, y: r.top + px(cs.paddingTop), w: b.left - a.right, h: r.height - px(cs.paddingTop) - px(cs.paddingBottom) });
      if (!row && b.top > a.bottom) gaps.push({ x: r.left + px(cs.paddingLeft), y: a.bottom, w: r.width - px(cs.paddingLeft) - px(cs.paddingRight), h: b.top - a.bottom });
    }
  }
  const d = (v: string) => `${fmt(px(v) / ds)}`;
  const rows: Array<[string, string]> = [
    ["size", `${fmt(r.width / ds)} × ${fmt(r.height / ds)}`],
    ["layout", cs.display === "flex" ? (cs.flexDirection.startsWith("row") ? (cs.flexWrap === "wrap" ? "row, wrapping" : "row") : "column") : cs.display],
  ];
  if (cs.display.includes("flex") && px(cs.gap) > 0) rows.push(["gap", d(cs.columnGap || cs.gap)]);
  if (px(cs.borderTopLeftRadius) > 0) rows.push(["cornerRadius", d(cs.borderTopLeftRadius)]);
  if (el.dataset.l === "Text") rows.push(["size (font)", d(cs.fontSize)], ["weight", cs.fontWeight]);
  const bg = cs.backgroundColor;
  if (bg && bg !== "rgba(0, 0, 0, 0)") rows.push(["color", bg.replace(/\s+/g, "")]);
  return {
    widget: el.dataset.l ?? "",
    path: el.dataset.path ?? "",
    line: Number(el.dataset.line ?? 0),
    box: { x: r.left, y: r.top, w: r.width, h: r.height },
    margin: four("margin"),
    border: four("border", "-width"),
    padding: four("padding"),
    gaps,
    rows,
  };
}

function syncTheme(doc: Document | null | undefined) {
  if (!doc) return;
  const t = document.documentElement.getAttribute("data-theme");
  if (t) doc.documentElement.setAttribute("data-theme", t);
  else doc.documentElement.removeAttribute("data-theme");
}

const DEFAULT_FRAMES: Frame[] = [
  { name: "m", w: 390 },
  { name: "t", w: 834 },
  { name: "w", w: 1200 },
];

export function Inspector({ src, frames = DEFAULT_FRAMES, lines, file, playground }: { src: string; frames?: Frame[]; lines: string[]; file: string; playground: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [width, setWidth] = useState(frames[1]?.w ?? 834);
  const [room, setRoom] = useState(760);
  const [ds, setDs] = useState(1);
  const [hover, setHover] = useState<Picked | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [inspecting, setInspecting] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [contentH, setContentH] = useState(0);
  const tip = useRef<HTMLDivElement>(null);
  const [tipSize, setTipSize] = useState({ w: 220, h: 40 });
  const pickedEl = useRef<HTMLElement | null>(null);
  const hoverEl = useRef<HTMLElement | null>(null);

  const scale = Math.min(1, room / width);
  const stageH = Math.round(Math.min(STAGE_MAX, Math.max(STAGE_MIN, contentH ? contentH * scale + 2 : 460)));
  const frameName = [...BANDS].reverse().find((b) => width >= b.from)?.name ?? "m";

  useIso(() => {
    const s = stage.current;
    if (!s) return;
    const ro = new ResizeObserver(() => requestAnimationFrame(() => setRoom(Math.max(240, s.clientWidth - 32 - 8))));
    ro.observe(s);
    return () => ro.disconnect();
  }, []);

  const remeasure = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    const root = doc?.querySelector(".l-root");
    if (!doc || !root) return;
    const unit = px(getComputedStyle(root).getPropertyValue("--ds")) / 1000 || 1;
    setDs(unit);
    // The page's own content height (the Scaffold body), so the stage shows the page, not empty frame.
    const body = doc.querySelector("main")?.firstElementChild;
    if (body) setContentH(body.getBoundingClientRect().height);
    if (pickedEl.current?.isConnected) setPicked(measure(pickedEl.current, unit));
    if (hoverEl.current?.isConnected) setHover(measure(hoverEl.current, unit));
  }, []);

  const attach = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body) return;
    syncTheme(doc);
    const unit = () => px(getComputedStyle(doc.querySelector(".l-root") as Element).getPropertyValue("--ds")) / 1000 || 1;
    const target = (e: Event) => (e.target as HTMLElement | null)?.closest?.("[data-path]") as HTMLElement | null;
    doc.addEventListener("pointermove", (e) => {
      const el = target(e);
      if (el === hoverEl.current) return;
      hoverEl.current = el;
      setHover(el ? measure(el, unit()) : null);
    });
    doc.addEventListener("pointerleave", () => {
      hoverEl.current = null;
      setHover(null);
    });
    doc.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        const el = target(e);
        if (!el) return;
        pickedEl.current = el;
        setPicked(measure(el, unit()));
      },
      true,
    );
    // Start on one precise object (the primary button): the page stays readable and the overlay
    // shows exact padding, size and source.
    const first = doc.querySelector<HTMLElement>("[data-l=Button][data-path]") ?? doc.querySelector<HTMLElement>("[data-path]");
    if (first) {
      pickedEl.current = first;
      setPicked(measure(first, unit()));
      setDs(unit());
    }
    const ro = new ResizeObserver(() => requestAnimationFrame(remeasure));
    ro.observe(doc.body);
  }, [remeasure]);

  useEffect(() => {
    const f = frameRef.current;
    if (!f) return;
    // The iframe may finish loading before hydration.
    if (f.contentDocument?.readyState === "complete" && f.contentDocument.querySelector(".l-root")) attach();
    f.addEventListener("load", attach);
    const mo = new MutationObserver(() => syncTheme(f.contentDocument));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      f.removeEventListener("load", attach);
      mo.disconnect();
    };
  }, [attach]);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(remeasure));
    return () => cancelAnimationFrame(id);
  }, [width, remeasure]);

  const onHandle = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const w0 = width;
    const s0 = scale;
    setDragging(true);
    const move = (ev: PointerEvent) => setWidth(Math.round(Math.min(MAX_W, Math.max(MIN_W, w0 + (ev.clientX - x0) / s0))));
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 80 : 16;
    if (e.key === "ArrowRight") setWidth((w) => Math.min(MAX_W, w + step));
    else if (e.key === "ArrowLeft") setWidth((w) => Math.max(MIN_W, w - step));
    else return;
    e.preventDefault();
  };

  const shown = inspecting ? (hover ?? picked) : null;
  useIso(() => {
    const el = tip.current;
    if (el && (el.offsetWidth !== tipSize.w || el.offsetHeight !== tipSize.h)) setTipSize({ w: el.offsetWidth, h: el.offsetHeight });
  });
  /** Above the box, else below it, else just inside its top; always inside the stage. */
  const tipPlace = (p: Picked): React.CSSProperties => {
    const x = 16 + p.box.x * scale;
    const top = 16 + p.box.y * scale;
    const bottom = 16 + (p.box.y + p.box.h) * scale;
    const y = top - tipSize.h - 6 >= 4 ? top - tipSize.h - 6 : bottom + 6 + tipSize.h <= stageH + 28 ? bottom + 6 : top + 4;
    return { left: Math.max(4, Math.min(x, room + 32 - tipSize.w - 4)), top: y };
  };
  const S = (n: number) => n * scale;
  const off = 16;
  const view = picked;

  return (
    <div className="inspector">
      <div className="insp-toolbar">
        <div className="seg" role="group" aria-label="Design frame">
          {frames.map((f) => (
            <button key={f.name} type="button" aria-pressed={frameName === f.name} onClick={() => setWidth(f.w)} title={`${f.name}: ${f.w}px wide`}>
              {f.name} {f.w}
            </button>
          ))}
        </div>
        <span className="dims num">
          {width} × {Math.round(stageH / scale)}
        </span>
        <span className="spacer" />
        <button type="button" className="tool" aria-pressed={inspecting} onClick={() => setInspecting((v) => !v)}>
          <Cursor size={14} /> Inspect
        </button>
        <a className="tool" href={playground}>
          <Play size={14} /> Edit
        </a>
      </div>
      <div className="insp-body">
        <div className="insp-stage" ref={stage} style={{ height: stageH + 32 }}>
          <div className="insp-viewport" style={{ width, height: stageH / scale, transform: `scale(${scale})` }}>
            <iframe ref={frameRef} src={src} title="A LAYR page under inspection" loading="eager" />
          </div>
          {shown ? (
            <>
              <div className="insp-overlay" style={{ left: off + S(shown.box.x - shown.margin[3]), top: off + S(shown.box.y - shown.margin[0]), width: S(shown.box.w + shown.margin[1] + shown.margin[3]), height: S(shown.box.h + shown.margin[0] + shown.margin[2]) }}>
                <div className="m" style={{ inset: 0, clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${S(shown.margin[3])}px ${S(shown.margin[0])}px, ${S(shown.margin[3])}px calc(100% - ${S(shown.margin[2])}px), calc(100% - ${S(shown.margin[1])}px) calc(100% - ${S(shown.margin[2])}px), calc(100% - ${S(shown.margin[1])}px) ${S(shown.margin[0])}px, ${S(shown.margin[3])}px ${S(shown.margin[0])}px)` }} />
                <div
                  className="p"
                  style={{ left: S(shown.margin[3] + shown.border[3]), top: S(shown.margin[0] + shown.border[0]), width: S(shown.box.w - shown.border[1] - shown.border[3]), height: S(shown.box.h - shown.border[0] - shown.border[2]) }}
                />
                <div
                  className="c"
                  style={{
                    left: S(shown.margin[3] + shown.border[3] + shown.padding[3]),
                    top: S(shown.margin[0] + shown.border[0] + shown.padding[0]),
                    width: Math.max(0, S(shown.box.w - shown.border[1] - shown.border[3] - shown.padding[1] - shown.padding[3])),
                    height: Math.max(0, S(shown.box.h - shown.border[0] - shown.border[2] - shown.padding[0] - shown.padding[2])),
                  }}
                />
              </div>
              {shown.gaps.map((g) => (
                <div key={`${g.x}-${g.y}`} className="insp-overlay" style={{ left: off + S(g.x), top: off + S(g.y), width: S(g.w), height: S(g.h) }}>
                  <div className="g" style={{ inset: 0 }} />
                </div>
              ))}
              <div className="insp-tip" ref={tip} style={tipPlace(shown)}>
                <b>{shown.widget}</b> <i>{fmt(shown.box.w / ds)} × {fmt(shown.box.h / ds)}</i>
                <br />
                {shown.path}
              </div>
            </>
          ) : null}
          <button
            type="button"
            className="insp-handle"
            data-active={dragging ? "" : undefined}
            style={{ left: off + width * scale + 4 }}
            role="slider"
            aria-label="Frame width"
            aria-valuemin={MIN_W}
            aria-valuemax={MAX_W}
            aria-valuenow={width}
            aria-valuetext={`${width} pixels, frame ${frameName}`}
            onPointerDown={onHandle}
            onKeyDown={onKey}
          >
            <ArrowsHorizontal size={10} />
          </button>
        </div>
        <aside className="insp-pane" aria-label="Selected object">
          <h4>Selected</h4>
          {view ? (
            <>
              <div className="insp-path">{view.path}</div>
              <div className="insp-src">
                <div className="insp-src-head">
                  {file}:{view.line}
                </div>
                <pre>
                  {[view.line - 1, view.line, view.line + 1]
                    .filter((n) => n >= 1 && n <= lines.length)
                    .map((n) => (
                      <div key={n} data-current={n === view.line ? "" : undefined}>
                        <span className="ln">{n}</span>
                        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: build-time highlighted source of the demo page */}
                        <span dangerouslySetInnerHTML={{ __html: lines[n - 1] ?? "" }} />
                      </div>
                    ))}
                </pre>
              </div>
              <div className="insp-box" aria-label="Box model in design pixels">
                <span>margin {fmt(view.margin[0] / ds)}</span>
                <div>
                  <div>
                    <div>{`${fmt((view.box.w - view.padding[1] - view.padding[3]) / ds)} × ${fmt((view.box.h - view.padding[0] - view.padding[2]) / ds)}`}</div>
                  </div>
                </div>
              </div>
              <dl className="insp-rows">
                <div>
                  <dt>padding</dt>
                  <dd>{view.padding.map((v) => fmt(v / ds)).join(" ")}</dd>
                </div>
                {view.rows.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
                <div>
                  <dt>1ds</dt>
                  <dd>{fmt(ds * 100) === "100" ? "1px" : `${(Math.round(ds * 1000) / 1000).toFixed(3)}px`} at {frameName}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="insp-hint">Point at anything in the page to see its box, its lookup path and the line that made it. Click to keep it selected.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
