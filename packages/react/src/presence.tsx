/**
 * Presence: when an `If` switches branch, the outgoing branch stays mounted until every Animate
 * inside it has played its `.exit(...)`; then the incoming branch mounts (deterministic "wait" mode).
 */
import { createElement, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Animate wrappers register how their object leaves. */
export const exitSpecs = new WeakMap<Element, () => Animation | null>();

export function Presence({ k, children }: { k: string; children?: ReactNode }): ReactNode {
  const [shownKey, setShownKey] = useState(k);
  const last = useRef<ReactNode>(children);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const switching = useRef<string | null>(null);

  if (shownKey === k) last.current = children;

  useIsoLayoutEffect(() => {
    if (shownKey === k || switching.current === k) return;
    switching.current = k;
    const root = wrapper.current;
    const animations: Animation[] = [];
    if (root && !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      for (const el of root.querySelectorAll("[data-l=Animate]")) {
        const a = exitSpecs.get(el)?.();
        if (a) animations.push(a);
      }
    }
    const done = () => {
      switching.current = null;
      setShownKey(k);
    };
    if (!animations.length) done();
    else Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(done);
  }, [k, shownKey]);

  return createElement("div", { ref: wrapper, className: "l-pass", style: { display: "contents" }, "data-presence": shownKey }, shownKey === k ? children : last.current);
}
