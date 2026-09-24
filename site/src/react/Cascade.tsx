/**
 * Export / Extract / Inject, live: a Styles-pane for one LAYR object on this page (`Home::card`).
 * Each checkbox adds or removes a real injection layer through the runtime; the final values are
 * read back from the same cascade the compiler builds, and `!mut` really refuses.
 */
import { inject, useExtract } from "@dynshift/layr/react";
import { all, arith, str } from "@dynshift/layr/runtime";
import { useEffect, useRef, useState } from "react";

const ADDRESS = "Home::card";

interface Layer {
  id: string;
  order: number;
  label: string;
  key: string;
  fn: (prev: unknown) => unknown;
}

const LAYERS: Layer[] = [
  { id: "double", order: 0, label: "card.padding = base * 2", key: "padding", fn: (prev) => arith("*", prev, 2) },
  { id: "plus", order: 1, label: "card.padding = card.padding + all(4)", key: "padding", fn: (prev) => arith("+", prev, all(4)) },
  { id: "tint", order: 2, label: "card.color = #1a66e8", key: "color", fn: () => "#1a66e8" },
];

function insetsText(v: unknown): string {
  const s = str(v);
  const m = s.match(/^\(([^)]*)\)$/);
  if (!m) return s;
  const parts = (m[1] as string).split(", ");
  return parts.every((p) => p === parts[0]) ? `all(${parts[0]})` : `only(${parts.join(", ")})`;
}

export function Cascade() {
  const [on, setOn] = useState<Record<string, boolean>>({ double: true });
  const [refused, setRefused] = useState(false);
  const disposers = useRef(new Map<string, () => void>());
  const padding = useExtract(ADDRESS, "padding");
  const color = useExtract(ADDRESS, "color");

  useEffect(() => {
    for (const l of LAYERS) {
      const active = !!on[l.id];
      const has = disposers.current.has(l.id);
      if (active && !has) disposers.current.set(l.id, inject(ADDRESS, l.key, l.order, l.fn));
      if (!active && has) {
        disposers.current.get(l.id)?.();
        disposers.current.delete(l.id);
      }
    }
    setRefused(!!on.tint);
  }, [on]);
  useEffect(
    () => () => {
      for (const d of disposers.current.values()) d();
      disposers.current.clear();
    },
    [],
  );

  return (
    <div className="cascade" aria-label="Injection layers on Store.card">
      <div className="cascade-rule">
        <header>
          <b>Store.card</b>
          <span>declared</span>
        </header>
        <div className="cascade-row">
          <span className="k">padding</span>: <span className="v">all(16)</span>
        </div>
        <div className="cascade-row" data-locked="">
          <span className="k">color</span>: <span className="v">panel</span>
        </div>
      </div>
      {LAYERS.map((l) => (
        <div className="cascade-rule" key={l.id}>
          <header>
            <b>Inject</b>
            <span>exeOrder({l.order})</span>
          </header>
          <label>
            <input type="checkbox" checked={!!on[l.id]} onChange={(e) => setOn((s) => ({ ...s, [l.id]: e.target.checked }))} />
            <span data-overridden={l.id === "tint" && on.tint ? "" : undefined}>{l.label}</span>
          </label>
          {l.id === "tint" && refused ? <p className="cascade-note">Refused: `color` is declared !mut, so the runtime ignores this layer (the compiler reports L3101 when it can see it).</p> : null}
        </div>
      ))}
      <div className="cascade-rule cascade-final">
        <header>
          <b>Resolved</b>
          <span>what renders</span>
        </header>
        <div className="cascade-row">
          <span className="k">padding</span>: <span className="v">{insetsText(padding)}</span>
        </div>
        <div className="cascade-row">
          <span className="k">color</span>: <span className="v">{String(color ?? "").startsWith("var(") || typeof color === "object" ? "panel" : String(color)}</span>
        </div>
      </div>
    </div>
  );
}
