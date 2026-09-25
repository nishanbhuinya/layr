/**
 * The React boundary. `F` renders an imported React component inside LAYR (optionally inside a
 * boundary box that takes LAYR layout keys). The hooks let React code take part in LAYR's
 * Export/Extract/Inject graph.
 */
import { lower } from "@layr-internal/model";
import { type Layer, registry } from "@layr-internal/runtime";
import { type ComponentType, createElement, type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { resolveOverrides, usePublish } from "./declared.ts";
import { useTrack } from "./track.ts";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface ForeignProps {
  /** The React component. */
  c: ComponentType<Record<string, unknown>> | string;
  /** Its props (`.props(...)`, slots, events, children). */
  p: Record<string, unknown>;
  /** Boundary box config (LAYR layout keys). */
  bx?: Record<string, unknown>;
  a?: string;
  /** Object props LAYR code extracts (published for Extract). */
  xs?: string[];
}

export function F({ c, p, bx, a, xs }: ForeignProps): ReactNode {
  // Its props and `obj` (children) take part in E/E/I like any feature: `chart.data = …`, `card.obj = …`.
  const declared: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) declared[k === "children" ? "obj" : k] = v;
  usePublish([a], declared, xs);
  const t = useTrack();
  let props = p;
  try {
    const resolved = a ? resolveOverrides([a], declared, () => true) : null;
    if (resolved) props = Object.fromEntries(Object.entries(resolved).map(([k, v]) => [k === "obj" ? "children" : k, v]));
  } finally {
    t.done();
  }
  const inner = createElement(c as ComponentType<Record<string, unknown>>, props);
  if (!bx && !a) return inner;
  const l = lower("Container", bx ?? {});
  const style: Record<string, string> = {};
  for (const [k, v] of Object.entries(l.decls)) style[k.startsWith("--") ? k : k.replace(/-([a-z])/g, (_m, ch: string) => ch.toUpperCase())] = v;
  return createElement("div", { className: l.classes.join(" "), style, "data-l": "React", "data-a": a }, inner);
}

/** Declarative Inject layers owned by a component: active while it is mounted. */
export function useInject(layers: Layer[]) {
  const ref = useRef(layers);
  ref.current = layers;
  useIsoLayoutEffect(() => {
    const disposers = ref.current.map((l, i) => registry.addLayer({ ...l, f: (prev: unknown) => (ref.current[i] as Layer).f(prev) }));
    return () => {
      for (const d of disposers) d();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.map((l) => `${l.a}#${l.k}#${l.o}`).join("|")]);
  // The layer functions close over this component's values; owners re-evaluate after each render.
  useIsoLayoutEffect(() => {
    registry.touch(ref.current.map((l) => l.a));
  });
}

/** File-level Inject: active for the lifetime of the app. */
export function injectGlobal(layers: Layer[]) {
  for (const l of layers) registry.addLayer(l);
}

/** React API: read a LAYR feature and re-render when it changes. */
export function useExtract<T = unknown>(address: string, key: string, order: number | null = null): T {
  const t = useTrack();
  try {
    return registry.read(address, key, order) as T;
  } finally {
    t.done();
  }
}

/** React API: add an injection layer; returns a disposer. */
export function inject(address: string, key: string, order: number | null, fn: (prev: unknown) => unknown): () => void {
  return registry.addLayer({ a: address, k: key, o: order, f: fn, src: "inject()" });
}
