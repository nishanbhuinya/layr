/**
 * Animate: interpolates every change to its object. Changes are detected on the rendered element
 * (attributes and size), so they animate whatever caused them: state, Function writes, injections,
 * theme or frame switches. Springs compile to CSS `linear()` easing; a change during an animation
 * retargets from the current on-screen value.
 */
import type { Ease, Spring } from "@layr-internal/model";

export interface MotionSpec {
  eases?: Record<string, Spring | Ease>;
  enter?: Array<{ kind: string; [k: string]: unknown }>;
  exit?: Array<{ kind: string; [k: string]: unknown }>;
  duration?: number;
  ease?: Spring | Ease;
  /** Animate even when the reader prefers reduced motion. */
  always?: boolean;
}

const KEY_TO_CSS: Record<string, string[]> = {
  w: ["width"],
  h: ["height"],
  size: ["width", "height"],
  color: ["background-color", "background-image"],
  opacity: ["opacity"],
  cornerRadius: ["border-radius"],
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  borderColor: ["border-color", "outline-color"],
  borderWidth: ["border-width", "outline-width"],
  shadow: ["box-shadow"],
  gap: ["gap"],
  x: ["translate"],
  y: ["translate"],
};

const TRACKED = ["width", "height", "background-color", "opacity", "border-radius", "padding-top", "padding-right", "padding-bottom", "padding-left", "border-color", "border-width", "box-shadow", "color", "gap", "translate", "outline-color", "outline-width", "font-size"];

const springCache = new Map<string, { easing: string; duration: number }>();

/** Simulates a spring (0 → 1) and encodes it as a CSS `linear()` easing with its settle duration. */
export function springEasing(s: Spring): { easing: string; duration: number } {
  const key = `${s.stiffness}/${s.damping}/${s.mass}`;
  const hit = springCache.get(key);
  if (hit) return hit;
  const dt = 1 / 120;
  let x = 0;
  let v = 0;
  const pts: number[] = [];
  let t = 0;
  let settled = 0;
  while (t < 3) {
    const a = (-s.stiffness * (x - 1) - s.damping * v) / s.mass;
    v += a * dt;
    x += v * dt;
    pts.push(x);
    t += dt;
    if (Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) {
      settled++;
      if (settled > 6) break;
    } else settled = 0;
  }
  const duration = Math.round(t * 1000);
  const step = Math.max(1, Math.floor(pts.length / 60));
  const sampled = pts.filter((_, i) => i % step === 0);
  sampled.push(1);
  const easing = `linear(0, ${sampled.map((p) => Math.round(p * 1000) / 1000).join(", ")})`;
  const r = { easing, duration };
  springCache.set(key, r);
  return r;
}

function timing(e: Spring | Ease | undefined, fallbackDuration: number): { easing: string; duration: number } {
  if (!e) return springEasing({ $: "spring", stiffness: 120, damping: 20, mass: 1 });
  if (e.$ === "spring") return springEasing(e);
  return { easing: e.css, duration: e.duration ?? fallbackDuration };
}

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Snapshot = Record<string, string>;

function snapshot(el: HTMLElement): Snapshot {
  const cs = getComputedStyle(el);
  const out: Snapshot = {};
  for (const p of TRACKED) out[p] = cs.getPropertyValue(p);
  return out;
}

/** Attaches Animate behaviour to the object inside `wrapper` (a `display: contents` element). Returns a disposer. */
export function applyMotion(wrapper: HTMLElement, getSpec: () => MotionSpec): () => void {
  const spec = new Proxy({} as MotionSpec, { get: (_t, k) => getSpec()[k as keyof MotionSpec] });
  const target = () => wrapper.firstElementChild as HTMLElement | null;
  let el = target();
  if (!el) return () => {};
  let prev = snapshot(el);
  const running = new Map<string, Animation>();
  const propTiming = (cssProp: string) => {
    for (const [key, props] of Object.entries(KEY_TO_CSS)) if (props.includes(cssProp) && spec.eases?.[key]) return timing(spec.eases[key], spec.duration ?? 300);
    return timing(spec.ease, spec.duration ?? 300);
  };

  // Enter
  if (spec.enter?.length && (spec.always || !reducedMotion())) {
    const from: Keyframe = {};
    for (const m of spec.enter) {
      if (m.kind === "fade") from.opacity = 0;
      if (m.kind === "scale") from.scale = String(m.from ?? 0.95);
      if (m.kind === "slide") from.translate = `calc(${Number(m.x ?? 0)} * var(--ds) / 1000) calc(${Number(m.y ?? 16)} * var(--ds) / 1000)`;
    }
    const tm = timing(spec.ease, spec.duration ?? 300);
    el.animate([from, {}], { duration: tm.duration, easing: tm.easing });
  }

  let scheduled = false;
  const check = () => {
    scheduled = false;
    const cur = target();
    if (!cur) return;
    if (cur !== el) {
      el = cur;
      prev = snapshot(cur);
      return;
    }
    // Read the settled target values: pause running animations' influence by reading after cancel.
    const live = snapshot(cur);
    const wasRunning = new Set(running.keys());
    for (const a of running.values()) a.cancel();
    running.clear();
    const next = snapshot(cur);
    if (reducedMotion() && !spec.always) {
      prev = next;
      return;
    }
    for (const p of TRACKED) {
      if (next[p] === prev[p] && !wasRunning.has(p)) continue;
      const fromValue = wasRunning.has(p) ? live[p] : prev[p];
      if (!fromValue || fromValue === next[p]) continue;
      const tm = propTiming(p);
      const anim = cur.animate([{ [camel(p)]: fromValue }, { [camel(p)]: next[p] }], { duration: tm.duration, easing: tm.easing });
      running.set(p, anim);
      anim.onfinish = () => running.delete(p);
    }
    prev = next;
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(check);
  };
  const mo = new MutationObserver(schedule);
  mo.observe(wrapper, { attributes: true, subtree: true, attributeFilter: ["style", "class"], childList: true, characterData: true });
  return () => {
    mo.disconnect();
    for (const a of running.values()) a.cancel();
  };
}

function camel(p: string): string {
  return p.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

/** The exit animation for an Animate's object (used by Presence). */
export function exitAnimation(el: HTMLElement | null, spec: MotionSpec): Animation | null {
  if (!el || !spec.exit?.length) return null;
  const to: Keyframe = {};
  for (const m of spec.exit) {
    if (m.kind === "fade") to.opacity = 0;
    if (m.kind === "scale") to.scale = String(m.from ?? 0.95);
    if (m.kind === "slide") to.translate = `calc(${Number(m.x ?? 0)} * var(--ds) / 1000) calc(${Number(m.y ?? 16)} * var(--ds) / 1000)`;
  }
  const tm = timing(spec.ease, spec.duration ?? 200);
  return el.animate([{}, to], { duration: tm.duration, easing: tm.easing, fill: "forwards" });
}
