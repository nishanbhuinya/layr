/** The active Design Scale frame as a signal (for runtime-only, per-frame values). */
import { DEFAULT_DESIGN_SCALE, type DesignScaleConfig, type PerFrame } from "@layr-internal/model";
import { Signal } from "./signals.ts";

export interface FrameInfo {
  name: string;
  w: number;
}

let config: DesignScaleConfig = DEFAULT_DESIGN_SCALE;
/** Frame assumed while prerendering (no viewport). */
let ssrFrame = "w";

export const currentFrame = new Signal<FrameInfo>({ name: ssrFrame, w: 1440 });

function pick(width: number): FrameInfo {
  const sorted = [...config.frames].sort((a, b) => a.from - b.from);
  let f = sorted[0];
  for (const x of sorted) if (width >= x.from) f = x;
  return { name: f?.name ?? "m", w: f?.w ?? 390 };
}

let listening = false;

export function configureFrames(cfg: DesignScaleConfig, opts: { ssrFrame?: string } = {}) {
  config = cfg;
  if (opts.ssrFrame) ssrFrame = opts.ssrFrame;
  if (typeof window === "undefined") {
    const f = cfg.frames.find((x) => x.name === ssrFrame) ?? cfg.frames[0];
    currentFrame.set({ name: f?.name ?? "m", w: f?.w ?? 390 });
    return;
  }
  const update = () => currentFrame.set(pick(window.innerWidth));
  update();
  if (!listening) {
    listening = true;
    window.addEventListener("resize", update, { passive: true });
  }
}

export function frame(): FrameInfo {
  return currentFrame.get();
}

export function frames<T>(values: Record<string, T>, step = true): PerFrame<T> {
  return { $: "frames", values, step };
}

/** Resolves a per-frame value for the active frame (stepped: the widest frame ≤ active that has a value). */
export function atFrame<T>(v: PerFrame<T>): T | undefined {
  const active = currentFrame.get().name;
  const sorted = [...config.frames].sort((a, b) => a.from - b.from);
  const idx = sorted.findIndex((f) => f.name === active);
  for (let i = idx; i >= 0; i--) {
    const name = (sorted[i] as { name: string }).name;
    if (name in v.values) return v.values[name];
  }
  return Object.values(v.values)[0];
}
