import { Observer, type Signal, signal, swapTracker, type Tracker } from "@layr-internal/runtime";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

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

export { signal };
export type { Signal };
