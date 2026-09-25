/**
 * The hero's live studio: a real LAYR page compiled in this browser and run in the same resizable
 * window as every docs example (dot canvas, corner grip), with an inspector over it. Everything the
 * inspector labels is read from the running page: `data-l` (widget), `data-path` and `data-line`
 * (compiled with `inspect`), computed boxes, and the page's own `--ds`. Edit opens this exact file.
 */
import { ArrowSquareOut, Check, Code as CodeIcon, Copy, Cursor, Eye } from "@phosphor-icons/react/ssr";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FrameChips, useRunner, Viewport } from "./stage.tsx";

interface Picked {
  widget: string;
  /** The object's full lookup path, through the widget instance it sits in. */
  path: string;
  /** Inside a widget: the path from the widget's definition, which addresses it in every instance. */
  local: string | null;
  line: number;
  box: { x: number; y: number; w: number; h: number };
  padding: [number, number, number, number];
  border: [number, number, number, number];
  gaps: Array<{ x: number; y: number; w: number; h: number }>;
}

const px = (v: string) => Number.parseFloat(v) || 0;
function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * An element's full lookup path. Inside a widget, `data-path` is relative to the widget's definition
 * (`Booking.row.text(0)`, the same in every instance); the instance's root carries where that instance
 * sits (`Room.….booking(1)`), so the two join into the path of this one object. Recursive for widgets
 * inside widgets.
 */
export function fullPath(el: HTMLElement): string {
  const own = el.dataset.path ?? "";
  const head = own.split(".")[0];
  let r: HTMLElement | null = el;
  while (r) {
    if (r.dataset.instance && r.dataset.path?.split(".")[0] === head) break;
    r = r.parentElement?.closest<HTMLElement>("[data-instance]") ?? null;
  }
  if (!r?.dataset.instance) return own;
  const rootPath = r.dataset.path as string;
  const outer = resolveFrom(r.dataset.instance, r.parentElement);
  return outer + own.slice(rootPath.length);
}

function resolveFrom(path: string, from: HTMLElement | null): string {
  const head = path.split(".")[0];
  let r: HTMLElement | null = from?.closest<HTMLElement>("[data-instance]") ?? null;
  while (r) {
    if (r.dataset.path?.split(".")[0] === head) return resolveFrom(r.dataset.instance as string, r.parentElement) + path.slice((r.dataset.path as string).length);
    r = r.parentElement?.closest<HTMLElement>("[data-instance]") ?? null;
  }
  return path;
}

function measure(el: HTMLElement): Picked {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const four = (p: string, suffix = ""): [number, number, number, number] => [px(cs.getPropertyValue(`${p}-top${suffix}`)), px(cs.getPropertyValue(`${p}-right${suffix}`)), px(cs.getPropertyValue(`${p}-bottom${suffix}`)), px(cs.getPropertyValue(`${p}-left${suffix}`))];
  const gaps: Picked["gaps"] = [];
  if (cs.display.includes("flex") && cs.flexWrap === "nowrap" && px(cs.columnGap) + px(cs.rowGap) > 0) {
    const kids = [...el.children].filter((c) => getComputedStyle(c).display !== "none").map((c) => c.getBoundingClientRect());
    const row = cs.flexDirection.startsWith("row");
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1] as DOMRect;
      const b = kids[i] as DOMRect;
      if (row && b.left > a.right) gaps.push({ x: a.right, y: r.top + px(cs.paddingTop), w: b.left - a.right, h: r.height - px(cs.paddingTop) - px(cs.paddingBottom) });
      if (!row && b.top > a.bottom) gaps.push({ x: r.left + px(cs.paddingLeft), y: a.bottom, w: r.width - px(cs.paddingLeft) - px(cs.paddingRight), h: b.top - a.bottom });
    }
  }
  const path = fullPath(el);
  const own = el.dataset.path ?? "";
  return { widget: el.dataset.l ?? "", path, local: own !== path ? own : null, line: Number(el.dataset.line ?? 0), box: { x: r.left, y: r.top, w: r.width, h: r.height }, padding: four("padding"), border: four("border", "-width"), gaps };
}

/**
 * The lookup path as the tree it is: each `.` descends one level (a widget, a slot, or an id), and
 * `(n)` picks among siblings of one kind. Clicking a segment selects that ancestor.
 */
function Path({ path, onPick }: { path: string; onPick?: (prefix: string) => void }) {
  const parts = path.split(".");
  return (
    <span className="st-path">
      {parts.map((p, i) => {
        const m = /^(.*?)(\(\d+\))?$/.exec(p) as RegExpExecArray;
        const prefix = parts.slice(0, i + 1).join(".");
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
          <span key={i}>
            {i ? <i>.</i> : null}
            {onPick ? (
              <button type="button" data-last={i === parts.length - 1 ? "" : undefined} onClick={() => onPick(prefix)} title={`Select ${prefix}`}>
                {m[1]}
                {m[2] ? <em>{m[2]}</em> : null}
              </button>
            ) : (
              <b data-last={i === parts.length - 1 ? "" : undefined}>
                {m[1]}
                {m[2] ? <em>{m[2]}</em> : null}
              </b>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** The page's lookup paths as a tree: each prefix, its children in document order, and whether an element carries it. */
interface Tree {
  kids: Map<string, string[]>;
  real: Set<string>;
  /** Full path → the element it names. */
  els: Map<string, HTMLElement>;
}

function buildTree(doc: Document): Tree {
  const kids = new Map<string, string[]>();
  const real = new Set<string>();
  const els = new Map<string, HTMLElement>();
  for (const el of doc.querySelectorAll<HTMLElement>("[data-path]")) {
    const path = fullPath(el);
    real.add(path);
    if (!els.has(path)) els.set(path, el);
    const segs = path.split(".");
    for (let i = 0; i < segs.length; i++) {
      const parent = segs.slice(0, i).join(".");
      const me = segs.slice(0, i + 1).join(".");
      const list = kids.get(parent) ?? [];
      if (!list.includes(me)) list.push(me);
      kids.set(parent, list);
    }
  }
  return { kids, real, els };
}

const lastSeg = (p: string) => p.slice(p.lastIndexOf(".") + 1);

/**
 * The lookup path as Miller columns: one column per level, a period between columns (each `.`
 * is one step down the tree), the chosen segment lit in each, and after the selection one more
 * column: what comes after its period. Pointing at an entry outlines it in the page.
 */
function TreeColumns({ tree, path, onPick, onPoint }: { tree: Tree; path: string; onPick: (p: string) => void; onPoint: (p: string | null) => void }) {
  const segs = path.split(".");
  const cols: Array<{ parent: string; chosen: string | null }> = segs.map((_, k) => ({ parent: segs.slice(0, k).join("."), chosen: segs.slice(0, k + 1).join(".") }));
  if ((tree.kids.get(path) ?? []).length) cols.push({ parent: path, chosen: null });
  const box = useRef<HTMLDivElement>(null);
  // Keep the newest columns (the selection and what follows it) in view.
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [path]);
  return (
    <div className="st-tree" ref={box} onPointerLeave={() => onPoint(null)}>
      {cols.map((c, k) => (
        <div key={c.parent || "root"} className="st-col-wrap">
          {k ? (
            <span className="st-dot" aria-hidden="true">
              .
            </span>
          ) : null}
          <ul className="st-col" data-next={c.chosen === null ? "" : undefined} data-sel={c.chosen === path ? "" : undefined} aria-label={c.chosen === null ? `After ${lastSeg(path)}.` : `Level ${k + 1}`}>
            {(tree.kids.get(c.parent) ?? []).map((p) => {
              const m = /^(.*?)(\(\d+\))?$/.exec(lastSeg(p)) as RegExpExecArray;
              const slot = !tree.real.has(p);
              return (
                <li key={p}>
                  <button type="button" aria-current={p === c.chosen ? "true" : undefined} data-slot={slot ? "" : undefined} onClick={() => onPick(p)} onPointerEnter={() => onPoint(p)} title={slot ? `${p} (a slot)` : p}>
                    <span>{m[1]}</span>
                    {m[2] ? <em>{m[2]}</em> : null}
                    {(tree.kids.get(p) ?? []).length ? <i aria-hidden="true">›</i> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** An Inject the reader added from the studio: appended to the file, compiled and run like any other. */
interface Layer {
  target: string;
  key: string;
  value: string;
}

const SWATCHES = ["accent", "teal", "violet", "gold", "ember", "ink"];
const BOXES = new Set(["Container", "Row", "Column", "Wrap", "Stack", "Button", "Grid"]);

/**
 * A feature the studio offers, with a few values. `label` is the chip; `into` descends from the picked
 * object to the one the Inject targets, and `key` is the feature there (a Button's text is its Text's `obj`).
 */
interface Feature {
  label: string;
  key: string;
  values: string[];
  swatch?: boolean;
  into?: string;
}

/** The features the studio offers for one kind of object, with a few values each. */
function featuresFor(widget: string): Feature[] {
  const out: Feature[] = [{ label: "color", key: "color", values: SWATCHES, swatch: true }];
  if (widget === "Text") out.push({ label: "text", key: "obj", values: ["'Studio A'", "'Booked'"] }, { label: "size", key: "size", values: ["13", "18", "26", "34"] });
  if (widget === "Button") out.push({ label: "text", key: "obj", into: "text", values: ["'Hold it'", "'Book now'"] });
  if (BOXES.has(widget)) out.push({ label: "padding", key: "padding", values: ["all(4)", "all(16)", "all(28)"] }, { label: "cornerRadius", key: "cornerRadius", values: ["0", "10", "999"] });
  return out;
}

/** The name an Inject uses for its target: the address's last segment, without `(n)`. */
const targetName = (address: string) => lastSeg(address).replace(/\(\d+\)$/, "");

export function injectLine(l: Layer, order: number): string {
  return `Inject(.into(${l.target}) .exeOrder(${order}) ${targetName(l.target)}.${l.key} = ${l.value})`;
}

function CopyLine({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      data-done={done ? "" : undefined}
      aria-label={done ? "Copied" : "Copy this line"}
      title="Copy this line"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {}
      }}
    >
      {done ? <Check size={14} weight="bold" /> : <Copy size={14} />}
    </button>
  );
}

const InjectBar = memo(function InjectBar({ widget, path, local, layers, setLayers }: { widget: string; path: string; local: string | null; layers: Layer[]; setLayers: (f: (l: Layer[]) => Layer[]) => void }) {
  const sel = { widget, path, local };
  const [every, setEvery] = useState(false);
  const features = featuresFor(sel.widget);
  const [label, setLabel] = useState(features[0]?.label ?? "color");
  const feature = features.find((f) => f.label === label) ?? features[0];
  const base = every && sel.local ? sel.local : sel.path;
  const target = feature?.into ? `${base}.${feature.into}` : base;
  const current = layers.find((l) => l.target === target && l.key === feature?.key)?.value;
  const put = (value: string) =>
    setLayers((ls) => {
      const rest = ls.filter((l) => !(l.target === target && l.key === feature?.key));
      return value === current ? rest : [...rest, { target, key: feature?.key ?? "color", value }];
    });
  if (!feature) return null;
  return (
    <div className="st-inject">
      <div className="st-inject-row">
        <span className="st-label">Inject</span>
        <div className="st-seg" role="group" aria-label="Feature">
          {features.map((f) => (
            <button key={f.label} type="button" aria-pressed={f.label === feature.label} onClick={() => setLabel(f.label)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="st-values" role="group" aria-label={`Value for ${feature.label}`}>
          {feature.values.map((v) => (
            <button key={v} type="button" aria-pressed={v === current} onClick={() => put(v)} title={`${targetName(target)}.${feature.key} = ${v}`} data-swatch={feature.swatch ? "" : undefined}>
              {feature.swatch ? <i style={{ background: `var(--layr-color-${v})` }} /> : null}
              <span>{v}</span>
            </button>
          ))}
        </div>
        {sel.local ? (
          <div className="st-seg" role="group" aria-label="Which objects">
            <button type="button" aria-pressed={!every} onClick={() => setEvery(false)}>
              This one
            </button>
            <button type="button" aria-pressed={every} onClick={() => setEvery(true)}>
              Every {sel.local.split(".")[0]}
            </button>
          </div>
        ) : null}
      </div>
      {layers.length ? (
        <ol className="st-layers" aria-label="Injection layers added to the file">
          {layers.map((l, i) => (
            <li key={`${l.target}:${l.key}`}>
              <code>{injectLine(l, i)}</code>
              <CopyLine text={injectLine(l, i)} />
              <button type="button" onClick={() => setLayers((ls) => ls.filter((x) => x !== l))} aria-label="Remove this layer" title="Remove the layer: the value reverts">
                ×
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="st-inject-hint">Pick a value: the line is added to the file, compiled and run. Remove it and the value reverts.</p>
      )}
    </div>
  );
});

export function Studio({ code, codeHtml, lines, file, playground }: { code: string; codeHtml: string; lines: string[]; file: string; playground: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(900);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [inspecting, setInspecting] = useState(true);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [ds, setDs] = useState(1);
  const [hover, setHover] = useState<Picked | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const hoverEl = useRef<HTMLElement | null>(null);
  const [tree, setTree] = useState<Tree | null>(null);
  const [copied, setCopied] = useState(false);
  const pickedEl = useRef<HTMLElement | null>(null);
  const inspectRef = useRef(inspecting);
  inspectRef.current = inspecting;
  const [layers, setLayers] = useState<Layer[]>([]);
  // The reader's Injects are appended to the file itself: what runs is exactly the file plus those lines.
  const source = useMemo(() => (layers.length ? `${code}\n\n${layers.map(injectLine).join("\n")}\n` : code), [code, layers]);
  const run = useRunner(source, true, { inspect: true });
  /** The selection survives a re-run (after an Inject) by its lookup path. */
  const selPath = useRef<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRoom(Math.max(280, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const remeasure = useCallback(() => {
    const doc = run.frame.current?.contentDocument;
    const root = doc?.querySelector(".l-root");
    if (!root) return;
    setDs(px(getComputedStyle(root).getPropertyValue("--ds")) / 1000 || 1);
    if (doc) setTree(buildTree(doc));
    if (pickedEl.current?.isConnected) setPicked(measure(pickedEl.current));
    else pickedEl.current = null;
    if (hoverEl.current?.isConnected) setHover(measure(hoverEl.current));
  }, [run.frame]);

  // Each run renders a fresh page: listen to it, and start on one precise object (the button).
  useEffect(() => {
    if (!run.ran) return;
    const doc = run.frame.current?.contentDocument;
    if (!doc?.body) return;
    const target = (e: Event) => (e.target as HTMLElement | null)?.closest?.("[data-path]") as HTMLElement | null;
    const move = (e: Event) => {
      if (!inspectRef.current) return;
      const el = target(e);
      if (el === hoverEl.current) return;
      hoverEl.current = el;
      setHover(el ? measure(el) : null);
    };
    const leave = () => {
      hoverEl.current = null;
      setHover(null);
    };
    const click = (e: Event) => {
      if (!inspectRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const el = target(e);
      if (!el) return;
      pickedEl.current = el;
      setPicked(measure(el));
    };
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerleave", leave);
    doc.addEventListener("click", click, true);
    if (!pickedEl.current?.isConnected) {
      const again = selPath.current ? buildTree(doc).els.get(selPath.current) : undefined;
      pickedEl.current = again ?? doc.querySelector<HTMLElement>("[data-l=Button][data-path]");
    }
    const ro = new ResizeObserver(() => requestAnimationFrame(remeasure));
    ro.observe(doc.body);
    remeasure();
    return () => {
      doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerleave", leave);
      doc.removeEventListener("click", click, true);
      ro.disconnect();
    };
  }, [run.ran, run.runs, run.frame, remeasure]);

  /** Select the object at a path prefix; a slot segment (`body`) selects the object it holds. */
  /** The element a full path names; a slot (`body`) resolves to the first object it holds. */
  const findPath = (prefix: string): HTMLElement | null => {
    if (!tree) return null;
    const exact = tree.els.get(prefix);
    if (exact) return exact;
    for (const [p, e] of tree.els) if (p.startsWith(`${prefix}.`)) return e;
    return null;
  };
  const pickPath = (prefix: string) => {
    const el = findPath(prefix);
    if (!el) return;
    pickedEl.current = el;
    setPicked(measure(el));
  };

  /** Outline the object at a path while the reader points at it in the tree. */
  const pointPath = (prefix: string | null) => {
    const doc = run.frame.current?.contentDocument;
    if (!doc || !prefix) {
      hoverEl.current = null;
      setHover(null);
      return;
    }
    const el = findPath(prefix);
    hoverEl.current = el ?? null;
    setHover(el ? measure(el) : null);
  };

  useEffect(() => {
    if (picked) selPath.current = picked.path;
  }, [picked]);

  const shown = inspecting ? (hover ?? picked) : null;
  const error = run.compiled?.errors ? (run.compiled.diagnostics.find((d) => d.severity === "error")?.message ?? "Compile error") : run.runtimeError;
  const sel = picked;

  const overlay = (scale: number) => {
    if (!shown) return null;
    const S = (n: number) => n * scale;
    const b = shown.box;
    const [pt, pr, pb, pl] = shown.padding;
    const [bt, br, bb, bl] = shown.border;
    const tipAbove = S(b.y) > 34;
    return (
      <>
        <div className="st-box" data-rest={hover ? undefined : ""} style={{ left: S(b.x), top: S(b.y), width: S(b.w), height: S(b.h) }}>
          <div className="st-pad" style={{ clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${S(pl + bl)}px ${S(pt + bt)}px,${S(pl + bl)}px calc(100% - ${S(pb + bb)}px),calc(100% - ${S(pr + br)}px) calc(100% - ${S(pb + bb)}px),calc(100% - ${S(pr + br)}px) ${S(pt + bt)}px,${S(pl + bl)}px ${S(pt + bt)}px)` }} />
        </div>
        {(hover ? shown.gaps : []).map((g) => (
          <div key={`${g.x}-${g.y}`} className="st-gap" style={{ left: S(g.x), top: S(g.y), width: S(g.w), height: S(g.h) }} />
        ))}
        <div className="st-tip" style={{ left: Math.max(0, S(b.x)), top: tipAbove ? S(b.y) - 6 : S(b.y + b.h) + 6, transform: tipAbove ? "translateY(-100%)" : undefined }}>
          <span className="st-tip-head">
            <b>{shown.widget}</b>
            <span>
              {fmt(b.w / ds)} × {fmt(b.h / ds)}
            </span>
          </span>
          <Path path={shown.path} />
        </div>
      </>
    );
  };

  return (
    <div className="studio live-box" ref={box}>
      <div className="live-bar" role="tablist" aria-label="Example">
        <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
          <Eye size={15} /> Preview
        </button>
        <button type="button" role="tab" aria-selected={tab === "code"} onClick={() => setTab("code")}>
          <CodeIcon size={15} /> {file.split("/").pop()}
        </button>
        <span className="spacer" />
        {tab === "preview" ? (
          <>
            <FrameChips stageW={room} w={w} h={h} setW={setW} setH={setH} />
            <button type="button" className="st-tool" aria-pressed={inspecting} onClick={() => setInspecting((v) => !v)} title="Point at anything to see its box, lookup path and source line">
              <Cursor size={15} /> Inspect
            </button>
          </>
        ) : null}
        <a className="live-open" href={playground} title="Open this file in the playground">
          <ArrowSquareOut size={15} />
          <span>Edit</span>
        </a>
      </div>
      <div hidden={tab !== "preview"}>
        <Viewport frame={run.frame} onLoad={run.onLoad} ready={run.ready} visible stageW={room} contentH={run.height} w={w} h={h} setW={setW} setH={setH} maxShownH={640} loading={!run.ran && !error} overlay={overlay}>
          {error ? <p className="live-error">{error}</p> : null}
        </Viewport>
        <div className="st-strip" aria-live="polite">
          {inspecting && sel ? (
            <>
              <div className="st-reach">
                <div className="st-reach-head">
                  <span className="st-label">Reach it from any file</span>
                  <Path path={sel.path} onPick={pickPath} />
                  <button
                    type="button"
                    className="st-copy"
                    data-done={copied ? "" : undefined}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(sel.path);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1400);
                      } catch {}
                    }}
                  >
                    {copied ? "Copied" : "Copy path"}
                  </button>
                </div>
                {sel.local ? (
                  <div className="st-local">
                    <span className="st-label">In every {sel.local.split(".")[0]}</span>
                    <Path path={sel.local} />
                  </div>
                ) : null}
                {tree ? <TreeColumns tree={tree} path={sel.path} onPick={pickPath} onPoint={pointPath} /> : null}
                <InjectBar key={sel.path} widget={sel.widget} path={sel.path} local={sel.local} layers={layers} setLayers={setLayers} />
              </div>
              <span className="st-src">
                <span className="st-ln">
                  {file.split("/").pop()}:{sel.line}
                </span>
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: build-time highlighted source line */}
                <code dangerouslySetInnerHTML={{ __html: (lines[sel.line - 1] ?? "").trim() }} />
              </span>
              <span className="st-dims">
                padding {sel.padding.map((v) => fmt(v / ds)).join(" ")} · 1ds = {fmt(ds * 1000) === "1000" ? "1px" : `${(Math.round(ds * 1000) / 1000).toFixed(3)}px`}
              </span>
            </>
          ) : (
            <span className="st-hint">{inspecting ? "Point at anything in the page to see its box, its lookup path and the line that made it." : "Inspect is off: the page is yours to click."}</span>
          )}
        </div>
      </div>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: build-time highlighted source */}
      <div className="live-code" hidden={tab !== "code"} dangerouslySetInnerHTML={{ __html: codeHtml }} />
    </div>
  );
}
