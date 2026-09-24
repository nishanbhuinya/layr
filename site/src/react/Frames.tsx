/**
 * The same LAYR page at three design frames at once (responsive mode's "all devices"). Each frame
 * is a real viewport; its label reads the page's own `--ds` once it loads.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

function FrameView({ src, name, w, h, scale }: { src: string; name: string; w: number; h: number; scale: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ds, setDs] = useState<string>("");
  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    const read = () => {
      const doc = f.contentDocument;
      const root = doc?.querySelector(".l-root");
      if (!doc || !root) return;
      const t = document.documentElement.getAttribute("data-theme");
      if (t) doc.documentElement.setAttribute("data-theme", t);
      setDs((Number.parseFloat(getComputedStyle(root).getPropertyValue("--ds")) / 1000).toFixed(3));
    };
    if (f.contentDocument?.readyState === "complete") read();
    f.addEventListener("load", read);
    return () => f.removeEventListener("load", read);
  }, []);
  return (
    <figure className="frame-view">
      <div className="frame-shot" style={{ width: w * scale, height: h * scale }}>
        <iframe ref={ref} src={src} title={`The demo page at frame ${name}, ${w} pixels wide`} tabIndex={-1} loading="lazy" style={{ width: w, height: h, transform: `scale(${scale})` }} />
      </div>
      <figcaption>
        <b>{name}</b> {w} × {h}
        {ds ? <span> · 1ds = {ds}px</span> : null}
      </figcaption>
    </figure>
  );
}

const FRAMES = [
  { name: "m", w: 390, h: 640 },
  { name: "t", w: 834, h: 640 },
  { name: "w", w: 1440, h: 640 },
];

export function Frames({ src, frames = FRAMES }: { src: string; frames?: Array<{ name: string; w: number; h: number }> }) {
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(1200);
  useIso(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => requestAnimationFrame(() => setRoom(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // One scale for every frame, so sizes compare truthfully; phones scroll the strip sideways.
  const total = frames.reduce((s, f) => s + f.w, 0);
  const scale = Math.max(0.22, Math.min(0.5, (room - 24 * (frames.length - 1)) / total));
  return (
    <div className="frames" ref={box}>
      {frames.map((f) => (
        <FrameView key={f.name} src={src} name={f.name} w={f.w} h={f.h} scale={scale} />
      ))}
    </div>
  );
}
