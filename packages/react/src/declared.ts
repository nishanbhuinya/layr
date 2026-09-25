/**
 * Declared values of slots and widget params, published for Extract and resolved through Inject
 * layers and writes. Data (text, numbers, LAYR values) compares structurally, so it republishes
 * every render; objects (React elements) are new on every render, so they are published only where
 * LAYR code reads them, and then only when what they show changes.
 */
import { registry } from "@layr-internal/runtime";
import { cloneElement, isValidElement, useEffect, useLayoutEffect, useRef } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** True for values the registry can compare structurally: no elements, no functions. */
function isData(v: unknown, depth = 0): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "function") return false;
  if (typeof v !== "object") return true;
  if (depth > 6 || isValidElement(v)) return false;
  if (Array.isArray(v)) return v.every((x) => isData(x, depth + 1));
  return Object.values(v).every((x) => isData(x, depth + 1));
}

/** What an object value shows: element types, keys and data props, recursively (functions are ignored). */
function signature(v: unknown, depth = 0): string {
  if (depth > 24) return "…";
  if (v === null || v === undefined || typeof v === "boolean") return String(v);
  if (typeof v === "string" || typeof v === "number") return JSON.stringify(v);
  if (typeof v === "function") return "fn";
  if (Array.isArray(v)) return `[${v.map((x) => signature(x, depth + 1)).join(",")}]`;
  if (isValidElement(v)) {
    const t = v.type as { displayName?: string; name?: string } | string;
    const name = typeof t === "string" ? t : (t?.displayName ?? t?.name ?? "?");
    const props = v.props as Record<string, unknown>;
    return `<${name}#${v.key ?? ""} ${Object.keys(props)
      .sort()
      .map((k) => `${k}=${signature(props[k], depth + 1)}`)
      .join(" ")}>`;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${k}:${signature(o[k], depth + 1)}`)
      .join(",")}}`;
  }
  return String(v);
}

/**
 * Publishes `values` as the declared features of `addresses` after each render. Keys in `objects`
 * (read by LAYR code) are published even when they hold elements; other object values are skipped.
 */
export function usePublish(addresses: (string | undefined)[], values: Record<string, unknown>, objects?: readonly string[]) {
  const seen = useRef(new Map<string, string>());
  useIsoLayoutEffect(() => {
    const live = addresses.filter((a): a is string => !!a);
    if (!live.length) return;
    for (const [k, v] of Object.entries(values)) {
      if (v === undefined) continue;
      if (!isData(v)) {
        if (!objects?.includes(k)) continue;
        const sig = signature(v);
        if (seen.current.get(k) === sig) continue;
        seen.current.set(k, sig);
      }
      for (const a of live) registry.publish(a, k, v);
    }
  });
}

/** A list of objects from an Inject (`list.objs = [Text('a'), Text('b')]`) renders in order, keyed by position. */
function keyed(v: unknown): unknown {
  if (!Array.isArray(v) || !v.some((x) => isValidElement(x) && x.key === null)) return v;
  return v.map((x, i) => (isValidElement(x) && x.key === null ? cloneElement(x, { key: `i${i}` }) : x));
}

/** Applies Inject layers and writes on `addresses` to the `keys` of `values` that have them (read while rendering, so it re-renders). */
export function resolveOverrides(addresses: (string | undefined)[], values: Record<string, unknown>, keys: (key: string) => boolean): Record<string, unknown> | null {
  let out: Record<string, unknown> | null = null;
  for (const a of addresses) {
    if (!a) continue;
    for (const k of registry.overriddenKeys(a)) {
      if (!keys(k)) continue;
      out ??= { ...values };
      out[k] = keyed(registry.resolve(a, k, out[k]));
    }
  }
  return out;
}
