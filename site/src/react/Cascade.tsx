/**
 * Export / Extract / Inject, live: a Styles-pane for one LAYR object on this page (`Home::card`).
 * Each checkbox adds or removes a real injection layer through the runtime; the final values are
 * read back from the same cascade the compiler builds, and `!mut` really refuses (untick it and
 * the runtime drops the modifier, as if it were deleted from the source).
 */
import { inject, useExtract } from "@dynshift/layr/react";
import { all, arith, Color, registry, str } from "@dynshift/layr/runtime";
import { useEffect, useRef, useState } from "react";

const ADDRESS = "Home::card";
/** `teal` exactly as the compiler emits the token: a colour that renders as the theme's variable. */
const TEAL = new Color(14, 159, 146, 1, "var(--layr-color-teal)");

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
  { id: "tint", order: 2, label: "card.color = teal", key: "color", fn: () => TEAL },
];

/** A theme colour reads back as its token (`var(--layr-color-teal)` → `teal`). */
function colorText(v: unknown): string {
  const s = str(v);
  return s.match(/^var\(--layr-color-([\w-]+)\)$/)?.[1] ?? s;
}

function insetsText(v: unknown): string {
  const s = str(v);
  const m = s.match(/^\(([^)]*)\)$/);
  if (!m) return s;
  const parts = (m[1] as string).split(", ");
  return parts.every((p) => p === parts[0]) ? `all(${parts[0]})` : `only(${parts.join(", ")})`;
}

export function Cascade() {
  const [on, setOn] = useState<Record<string, boolean>>({ double: true });
  // `!mut` on color, as the source declares it. Unticking drops it from the runtime, as if the
  // modifier were deleted from store.layr, so the tint layer can then apply.
  const [locked, setLocked] = useState(true);
  const lockedWas = useRef(true);
  const disposers = useRef(new Map<string, () => void>());
  const padding = useExtract(ADDRESS, "padding");
  const color = useExtract(ADDRESS, "color");
  const refused = !!on.tint && locked;

  useEffect(() => {
    if (lockedWas.current !== locked) {
      lockedWas.current = locked;
      if (locked) registry.immutable({ [ADDRESS]: ["color"] });
      else registry.mutable({ [ADDRESS]: ["color"] });
      // A layer is checked against !mut when it is added: re-add the colour layer under the new rule.
      for (const l of LAYERS) {
        if (l.key !== "color") continue;
        disposers.current.get(l.id)?.();
        disposers.current.delete(l.id);
      }
    }
    for (const l of LAYERS) {
      const active = !!on[l.id];
      const has = disposers.current.has(l.id);
      if (active && !has) disposers.current.set(l.id, inject(ADDRESS, l.key, l.order, l.fn));
      if (!active && has) {
        disposers.current.get(l.id)?.();
        disposers.current.delete(l.id);
      }
    }
  }, [on, locked]);
  useEffect(
    () => () => {
      for (const d of disposers.current.values()) d();
      disposers.current.clear();
      if (!lockedWas.current) registry.immutable({ [ADDRESS]: ["color"] });
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
        <label className="cascade-mut" title={locked ? "Untick to delete !mut from the declaration" : "Tick to declare color !mut again"}>
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
          <span>
            <span className="m" data-overridden={locked ? undefined : ""}>!mut</span> <span className="k">color</span>: <span className="v">panel</span>
          </span>
        </label>
      </div>
      {LAYERS.map((l) => (
        <div className="cascade-rule" key={l.id}>
          <header>
            <b>Inject</b>
            <span>exeOrder({l.order})</span>
          </header>
          <label>
            <input type="checkbox" checked={!!on[l.id]} onChange={(e) => setOn((s) => ({ ...s, [l.id]: e.target.checked }))} />
            <span data-overridden={l.key === "color" && refused ? "" : undefined}>{l.label}</span>
          </label>
          {l.key === "color" && refused ? <p className="cascade-note">Refused: `color` is declared !mut, so the runtime ignores this layer (the compiler reports L3101 when it can see it). Untick !mut above to allow it.</p> : null}
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
          <span className="k">color</span>: <span className="v">{colorText(color)}</span>
        </div>
      </div>
    </div>
  );
}
