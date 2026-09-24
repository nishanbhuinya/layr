/**
 * The hero's ground: this page's own LAYR source set as a character grid on a canvas, line after
 * line with no gaps (indentation kept, so the layout's shape shows), where characters keep
 * glitching into the site's light (ember, gold, violet, teal) and settling back. Drawn at device
 * resolution and rebuilt on resize, so it is sharp at every size; only changed cells repaint.
 * With reduced motion it is drawn once and holds still.
 */
import { useEffect, useRef } from "react";

const GLYPHS = "(){}[].,:;=+-*/<>!?'_#0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function readVar(el: Element, name: string, fallback: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

/** "#rrggbb" or "rgb(...)" → [r, g, b]. */
function rgb(c: string): [number, number, number] {
  if (c.startsWith("#")) {
    const h = c.length === 4 ? c.replace(/[0-9a-f]/gi, "$&$&") : c;
    return [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  const m = c.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

export function CodeField({ source }: { source: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const lines = source
      .replace(/\t/g, "  ")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => l.replace(/\s+$/, ""));
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cols = 0;
    let rows = 0;
    let cw = 0;
    let ch = 0;
    let base: string[] = [];
    // Per cell: the glyph shown, and how lit it is (1 just glitched, fading to 0).
    let shown: string[] = [];
    let heat = new Float32Array(0);
    let hue = new Uint8Array(0);
    let ink: [number, number, number] = [28, 25, 23];
    let inkAlpha = 0.1;
    let lights: Array<[number, number, number]> = [];
    const active = new Set<number>();
    let dark = false;

    const theme = () => {
      const root = document.querySelector(".l-root") ?? document.documentElement;
      dark = document.documentElement.getAttribute("data-theme") === "dark" || (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
      ink = rgb(readVar(root, "--layr-color-ink", dark ? "#f3ede6" : "#1c1917"));
      inkAlpha = dark ? 0.085 : 0.1;
      lights = ["--layr-color-ember", "--layr-color-gold", "--layr-color-violet", "--layr-color-teal"].map((v) => rgb(readVar(root, v, "#ff6a3d")));
    };

    const paintCell = (i: number) => {
      const x = (i % cols) * cw;
      const y = Math.floor(i / cols) * ch;
      ctx.clearRect(x, y, cw, ch);
      const g = shown[i] as string;
      if (g === " ") return;
      const h = heat[i] as number;
      if (h > 0.01) {
        const [r, gg, b] = lights[hue[i] as number] as [number, number, number];
        // Mix from the light back to the quiet ink as the cell cools.
        const k = h;
        const cr = Math.round(ink[0] + (r - ink[0]) * k);
        const cg = Math.round(ink[1] + (gg - ink[1]) * k);
        const cb = Math.round(ink[2] + (b - ink[2]) * k);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${inkAlpha + (0.95 - inkAlpha) * k})`;
      } else ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${inkAlpha})`;
      ctx.fillText(g, x, y + ch * 0.78);
    };

    const build = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const size = w < 640 ? 11 : 13;
      ctx.font = `450 ${size}px "Geist Mono Variable", ui-monospace, monospace`;
      cw = ctx.measureText("M").width;
      ch = Math.round(size * 1.35);
      cols = Math.ceil(w / cw);
      rows = Math.ceil(h / ch);
      // The source, one line per row; a wide screen gets several columns of it side by side.
      const colW = Math.max(40, Math.min(cols, 88));
      base = new Array(cols * rows).fill(" ");
      let n = 0;
      for (let c0 = 0; c0 < cols; c0 += colW + 3) {
        for (let r = 0; r < rows; r++) {
          const line = lines[n++ % lines.length] as string;
          for (let k = 0; k < Math.min(colW, line.length) && c0 + k < cols; k++) base[r * cols + c0 + k] = line[k] as string;
        }
      }
      shown = base.slice();
      heat = new Float32Array(cols * rows);
      hue = new Uint8Array(cols * rows);
      active.clear();
      theme();
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < shown.length; i++) if (shown[i] !== " ") paintCell(i);
    };

    let raf = 0;
    let visible = true;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 50) return;
      last = t;
      // A few cells glitch each frame: a different glyph, lit in one of the lights.
      const count = Math.max(4, Math.round((cols * rows) / 260));
      for (let k = 0; k < count; k++) {
        const i = Math.floor(Math.random() * base.length);
        if (base[i] === " ") continue;
        shown[i] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] as string;
        heat[i] = 1;
        hue[i] = Math.floor(Math.random() * lights.length);
        active.add(i);
      }
      for (const i of active) {
        heat[i] = (heat[i] as number) * 0.94 - 0.006;
        if ((heat[i] as number) <= 0.02) {
          heat[i] = 0;
          shown[i] = base[i] as string;
          active.delete(i);
        }
        paintCell(i);
      }
    };

    build();
    canvas.dataset.ready = "";
    const ro = new ResizeObserver(() => build());
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !still) raf = requestAnimationFrame(tick);
    });
    io.observe(canvas);
    const mo = new MutationObserver(() => requestAnimationFrame(build));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", build);
    addEventListener("layr-theme", build);
    void document.fonts?.load('450 13px "Geist Mono Variable"').then(build);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", build);
      removeEventListener("layr-theme", build);
    };
  }, [source]);

  return (
    <div className="code-field" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
