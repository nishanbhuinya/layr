/**
 * `@dynshift/layr/react`: the React render target. Compiled `.layr` modules import this as `$`.
 * React apps can also use the interop API (LayrProvider, useExtract, inject) directly.
 */
import { arith, type Signal } from "@layr-internal/runtime";

export { ActionContext, batch, computed, detached, effect, frame, run, signal } from "@layr-internal/runtime";
export { type AppConfig, LayrApp, LayrProvider, LayrRoot, mount, useRoute } from "./app.tsx";
export { F, inject, injectGlobal, useExtract, useInject } from "./interop.tsx";
export { springEasing } from "./motion.ts";
export { icons, N, preset } from "./node.tsx";
export { Presence } from "./presence.tsx";
export { pageStore, params, useInstance, useTrack } from "./track.ts";

import { registry, router } from "@layr-internal/runtime";

export const read = registry.read;
export const write = registry.write;
export const immutable = registry.immutable;
export const declare = registry.declare;
export const explain = registry.explain;
export const page = router.page;
export const go = router.go;
export const back = router.back;
export const hrefFor = router.hrefFor;

/** `x++` / `--x` on a signal inside TS bodies: returns the old (postfix) or new (prefix) value. */
export function bump(s: Signal<number>, delta: number, prefix: boolean): number {
  const old = s.peek();
  s.set(old + delta);
  return prefix ? old + delta : old;
}

export function add(a: unknown, b: unknown): unknown {
  return arith("+", a, b);
}
