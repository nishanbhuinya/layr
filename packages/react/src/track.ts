import { Observer, type Signal, signal, swapTracker, type Tracker } from "@layr-internal/runtime";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { resolveOverrides, usePublish } from "./declared.ts";

/**
 * Tracks every signal a component reads while rendering and re-renders it when any of them change.
 * Compiled components call it first and `done()` in a `finally`.
 */
export function useTrack(): { done(): void } {
  const ref = useRef<Observer | null>(null);
  if (!ref.current) ref.current = new Observer();
  const obs = ref.current;
  const subscribe = useCallback(
    (cb: () => void) => {
      obs.listen(cb);
      return () => obs.listen(null);
    },
    [obs],
  );
  useSyncExternalStore(
    subscribe,
    () => obs.version,
    () => obs.version,
  );
  useEffect(() => {
    // Re-subscribe after a (StrictMode) remount; dispose on unmount.
    obs.end();
    return () => obs.dispose();
  }, [obs]);
  obs.begin();
  const prev: Tracker | null = swapTracker(obs);
  return {
    done() {
      swapTracker(prev);
      obs.end();
    },
  };
}

const stores = new Map<string, unknown>();

/** A page's state, created on first use and kept for the session (`.state(keep)`). */
export function pageStore<T>(name: string, factory: () => T): () => T {
  return () => {
    if (!stores.has(name)) stores.set(name, factory());
    return stores.get(name) as T;
  };
}

/** Per-instance state (widgets, `.state(reset)` pages). */
export function useInstance<T>(factory: () => T): T {
  const ref = useRef<{ v: T } | null>(null);
  if (!ref.current) ref.current = { v: factory() };
  return ref.current.v;
}

export function params<P extends Record<string, unknown>>(p: P, defaults: Record<string, unknown>): P {
  const out: Record<string, unknown> = { ...p };
  for (const [k, v] of Object.entries(defaults)) if (out[k] === undefined) out[k] = v;
  return out as P;
}

/**
 * A widget's params as it renders them: the caller's values over the defaults, then Inject layers
 * and writes on this instance (`b.label = 'New'`, and `b.obj = …` for what the caller put in
 * `.obj`). They are published for Extract. Called by compiled widgets, after `useTrack()`.
 */
export function useParams<P extends Record<string, unknown>>(p: P, defaults: Record<string, unknown>): P {
  const out: Record<string, unknown> = params(p, defaults);
  const a = typeof p.$a === "string" ? p.$a : undefined;
  const declared: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(out)) if (!k.startsWith("$") && k !== "children") declared[k] = v;
  if (out.children !== undefined) declared.obj = out.children;
  usePublish([a], declared, p.$xs as string[] | undefined);
  const resolved = resolveOverrides([a], declared, () => true);
  if (resolved) for (const [k, v] of Object.entries(resolved)) out[k === "obj" ? "children" : k] = v;
  return out as P;
}

export { signal };
export type { Signal };
