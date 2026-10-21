import { Observer, registry, type Signal, signal, swapTracker, type Tracker } from "@layr-internal/runtime";
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

const stores = new Map<string, Record<string, unknown>>();

/**
 * A page's state, created on first use and kept for the session (`.state(keep)`). `keys` names the
 * page's state: when a new version of the page declares state the kept store lacks (a hot reload,
 * a playground re-run), the store is rebuilt, keeping the values of the names both versions share.
 */
export function pageStore<T>(name: string, factory: () => T, keys?: string[]): () => T {
  return () => {
    const kept = stores.get(name);
    if (kept && (!keys || keys.every((k) => k in kept))) return kept as T;
    const fresh = factory() as Record<string, unknown>;
    if (kept) for (const k of Object.keys(fresh)) if (k in kept) fresh[k] = kept[k];
    stores.set(name, fresh);
    return fresh as T;
  };
}

/** Forgets every kept page state (a runner starting a new program). */
export function resetStores(): void {
  stores.clear();
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
  // A Duplicate of a widget instance follows the original instance's params.
  const mi = p.$mi as { a: string; o: number | null; v?: Record<string, unknown> } | undefined;
  if (a && mi) registry.mirror(a, mi.a, mi.o, mi.v);
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
