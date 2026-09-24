/**
 * One file at every design frame, side by side: the hero's page compiled once in this browser and
 * run in three real viewports at their design sizes (m 390 × 844, t 834 × 1194, w 1440 × 900),
 * scaled to one height and standing on one baseline like a device lineup. Each caption reads the
 * page's own `--ds` once it has rendered.
 */
import { useEffect, useRef, useState } from "react";
import { type Compiled, compile, currentTheme } from "../lib/runner.ts";

const FRAMES = [
  { name: "m", w: 390, h: 844, label: "Phone" },
  { name: "t", w: 834, h: 1194, label: "Tablet" },
  { name: "w", w: 1440, h: 900, label: "Desktop" },
];
const GAP = 24;

function Device({ compiled, name, w, h, label, scale }: { compiled: Compiled | null; name: string; w: number; h: number; label: string; scale: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [ds, setDs] = useState("");
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      if (e.data?.type === "ready") setReady(true);
      if (e.data?.type === "ran") {
        const root = ref.current?.contentDocument?.querySelector(".l-root");
        if (root) setDs((Number.parseFloat(getComputedStyle(root).getPropertyValue("--ds")) / 1000).toFixed(3));
      }
    };
    addEventListener("message", onMsg);
    return () => removeEventListener("message", onMsg);
  }, []);
  useEffect(() => {
    if (!ready || !compiled || compiled.errors) return;
    const win = ref.current?.contentWindow;
    win?.postMessage({ type: "height", auto: false }, location.origin);
    win?.postMessage({ type: "run", js: compiled.js, css: compiled.css, modules: compiled.modules, aliases: compiled.aliases, theme: currentTheme() }, location.origin);
  }, [ready, compiled]);
  useEffect(() => {
    const mo = new MutationObserver(() => ref.current?.contentWindow?.postMessage({ type: "theme", theme: currentTheme() ?? null }, location.origin));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return (
    <figure className="device" data-frame={name}>
      <div className="device-screen" style={{ width: w * scale, height: h * scale }}>
        <iframe ref={ref} src="/run.html" title={`The page at frame ${name}, ${w} by ${h}`} tabIndex={-1} loading="lazy" onLoad={() => setReady(true)} style={{ width: w, height: h, transform: `scale(${scale})` }} />
      </div>
      <figcaption>
        <b>{name}</b>
        <span>{label}</span>
        <span className="num">
          {w} × {h}
        </span>
        {ds ? <span className="num">1ds = {ds === "1.000" ? "1px" : `${ds}px`}</span> : null}
      </figcaption>
    </figure>
  );
}

export function Frames({ code }: { code: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(1200);
  const [visible, setVisible] = useState(false);
  const [compiled, setCompiled] = useState<Compiled | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRoom(el.clientWidth));
    ro.observe(el);
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisible(true), { rootMargin: "600px" });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);
  useEffect(() => {
    if (visible) void compile(code).then(setCompiled);
  }, [visible, code]);

  // Wide: all three on one baseline at one height. Narrower: the desktop above, phone and tablet
  // beside each other below. Narrowest: one per row.
  const ratio = (f: (typeof FRAMES)[number]) => f.w / f.h;
  const line = FRAMES.reduce((s, f) => s + ratio(f), 0);
  const oneRow = (room - GAP * 2) / line;
  const layout = oneRow >= 300 ? "row" : room >= 520 ? "split" : "column";
  const scaleFor = (f: (typeof FRAMES)[number]) => {
    if (layout === "row") return oneRow / f.h;
    if (layout === "split") {
      if (f.name === "w") return room / f.w;
      const pair = (room - GAP) / (ratio(FRAMES[0] as never) + ratio(FRAMES[1] as never));
      return pair / f.h;
    }
    return Math.min(room / f.w, 560 / f.h);
  };

  return (
    <div className="lineup" data-layout={layout} ref={box}>
      {FRAMES.map((f) => (
        <Device key={f.name} compiled={visible ? compiled : null} {...f} scale={scaleFor(f)} />
      ))}
    </div>
  );
}
