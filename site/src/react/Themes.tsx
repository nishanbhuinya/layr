/**
 * Site themes. The default is LAYR (following the system, or pinned light or dark); the others
 * are complete palettes of the site's tokens, and Custom lets a reader set every token, with the
 * contrast of each pairing that carries text checked as they go. A choice is this reader's
 * convenience, kept in their browser and applied before first paint by the script in index.html.
 */
import { Check, Palette as PaletteIcon, Warning, WarningCircle } from "@phosphor-icons/react/ssr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const TOKENS = ["canvas", "panel", "sunken", "line", "lineStrong", "ink", "muted", "faint", "accent", "action", "onAccent", "ember", "gold", "teal", "violet", "danger", "warn"] as const;
type Token = (typeof TOKENS)[number];
type Colors = Record<Token, string>;
interface Theme {
  id: string;
  name: string;
  note: string;
  scheme: "light" | "dark" | "system";
  colors?: Colors;
}

const LAYR_LIGHT: Colors = { canvas: "#f4efe7", panel: "#fffcf7", sunken: "#efe8dd", line: "#e4dbcd", lineStrong: "#cdc1af", ink: "#1c1917", muted: "#625a50", faint: "#938a7e", accent: "#c93f12", action: "#c93f12", onAccent: "#ffffff", ember: "#e8551f", gold: "#d99a1e", teal: "#0e9f92", violet: "#6d5ce6", danger: "#c42b1c", warn: "#9a5b00" };
const LAYR_DARK: Colors = { canvas: "#121110", panel: "#1a1816", sunken: "#221f1c", line: "#2e2a26", lineStrong: "#433d37", ink: "#f3ede6", muted: "#b0a79d", faint: "#7f776e", accent: "#ff6a3d", action: "#e8531f", onAccent: "#ffffff", ember: "#ff6a3d", gold: "#ffc46b", teal: "#2ed3c4", violet: "#9b8cff", danger: "#ff8577", warn: "#ffc46b" };

export const THEMES: Theme[] = [
  { id: "layr", name: "LAYR", note: "Warm studio, following your system", scheme: "system" },
  { id: "layr-light", name: "LAYR Light", note: "Warm paper, ember accent", scheme: "light", colors: LAYR_LIGHT },
  { id: "layr-dark", name: "LAYR Dark", note: "Warm charcoal, ember accent", scheme: "dark", colors: LAYR_DARK },
  {
    id: "coffee",
    name: "Coffee",
    note: "Roasted brown, caramel accent",
    scheme: "dark",
    colors: { canvas: "#17110e", panel: "#201813", sunken: "#291f19", line: "#382b23", lineStrong: "#4d3c31", ink: "#f2e7dc", muted: "#c0ab99", faint: "#8c7666", accent: "#e8a86a", action: "#b86a2e", onAccent: "#ffffff", ember: "#e8a86a", gold: "#f0c98a", teal: "#8fc7b4", violet: "#c7a4e0", danger: "#ff8a78", warn: "#f0c98a" },
  },
  {
    id: "obsidian",
    name: "Obsidian",
    note: "Cool black, violet accent",
    scheme: "dark",
    colors: { canvas: "#0c0d11", panel: "#13151b", sunken: "#191c23", line: "#252933", lineStrong: "#353a46", ink: "#e9ebf1", muted: "#a3a9b8", faint: "#6e7587", accent: "#a891ff", action: "#7255f0", onAccent: "#ffffff", ember: "#ff7a59", gold: "#f5c56b", teal: "#4fd1c5", violet: "#a891ff", danger: "#ff7b8a", warn: "#f5c56b" },
  },
  {
    id: "forest",
    name: "Forest",
    note: "Deep green, mint accent",
    scheme: "dark",
    colors: { canvas: "#0e1411", panel: "#141c18", sunken: "#1a241f", line: "#25322b", lineStrong: "#34453c", ink: "#e5eee8", muted: "#a4b6ab", faint: "#6f8378", accent: "#6fdcaa", action: "#1f8f60", onAccent: "#ffffff", ember: "#ff8a5b", gold: "#e9c46a", teal: "#6fdcaa", violet: "#a99cf5", danger: "#ff8577", warn: "#e9c46a" },
  },
  {
    id: "paper",
    name: "Paper",
    note: "Bright white, ink-blue accent",
    scheme: "light",
    colors: { canvas: "#f6f6f3", panel: "#ffffff", sunken: "#eeeee9", line: "#e1e0d9", lineStrong: "#c9c7bd", ink: "#191b20", muted: "#575c66", faint: "#8a8f99", accent: "#2350c2", action: "#2350c2", onAccent: "#ffffff", ember: "#d9531e", gold: "#c48a12", teal: "#0f8f84", violet: "#5b4bd6", danger: "#c42b1c", warn: "#8f5700" },
  },
  {
    id: "dune",
    name: "Dune",
    note: "Sand and sunlight, teal accent",
    scheme: "light",
    colors: { canvas: "#f1e9da", panel: "#fbf6ec", sunken: "#e9dfcc", line: "#dccfb6", lineStrong: "#c4b393", ink: "#2a2118", muted: "#65573f", faint: "#968567", accent: "#0b7a70", action: "#0b7a70", onAccent: "#ffffff", ember: "#c8541c", gold: "#b98313", teal: "#0b7a70", violet: "#6a55c9", danger: "#b3261e", warn: "#8a5300" },
  },
];

// ------------------------------------------------------------------ contrast (WCAG 2)

function lum(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, "$&$&") : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** Every pairing that carries text, with the ratio it needs. */
const CHECKS: Array<{ fg: Token; bg: Token; what: string; min: number }> = [
  { fg: "ink", bg: "canvas", what: "Text on the page", min: 4.5 },
  { fg: "ink", bg: "panel", what: "Text on panels", min: 4.5 },
  { fg: "muted", bg: "panel", what: "Secondary text", min: 4.5 },
  { fg: "faint", bg: "panel", what: "Hints and captions", min: 3 },
  { fg: "accent", bg: "panel", what: "Links", min: 4.5 },
  { fg: "onAccent", bg: "action", what: "Button labels", min: 3 },
];

// ------------------------------------------------------------------ applying

const STORE = "layr-palette";

/** The CSS a palette becomes: tokens on the app root (beating its own theme rule), and the page ground. */
export function paletteCss(colors: Colors, scheme: "light" | "dark"): string {
  const vars = TOKENS.map((t) => `--layr-color-${t}:${colors[t]}`).join(";");
  // Outranks the app's own theme rules, including its dark ones (`:root[data-theme=dark] .l-root`).
  return `:root:root:root .l-root.l-root{${vars};color-scheme:${scheme}}:root:root:root{background:${colors.canvas};color-scheme:${scheme}}`;
}

function apply(theme: Theme, colors?: Colors) {
  requestAnimationFrame(() => dispatchEvent(new Event("layr-theme")));
  const root = document.documentElement;
  let style = document.getElementById("layr-palette") as HTMLStyleElement | null;
  const c = colors ?? theme.colors;
  if (theme.scheme === "system" || !c) {
    style?.remove();
    root.removeAttribute("data-theme");
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = "layr-palette";
    document.head.appendChild(style);
  }
  style.textContent = paletteCss(c, theme.scheme);
  root.setAttribute("data-theme", theme.scheme);
}

function save(theme: Theme, colors?: Colors) {
  try {
    if (theme.scheme === "system") {
      localStorage.removeItem(STORE);
      localStorage.removeItem("layr-theme");
      return;
    }
    const c = colors ?? theme.colors;
    if (!c) return;
    localStorage.setItem(STORE, JSON.stringify({ id: theme.id, scheme: theme.scheme, colors: c, css: paletteCss(c, theme.scheme) }));
    localStorage.setItem("layr-theme", theme.scheme);
  } catch {}
}

function saved(): { id: string; scheme: "light" | "dark"; colors: Colors } | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw);
    // Readers who picked light or dark with the old toggle keep it.
    const t = localStorage.getItem("layr-theme");
    if (t === "light" || t === "dark") return { id: `layr-${t}`, scheme: t, colors: t === "light" ? LAYR_LIGHT : LAYR_DARK };
  } catch {}
  return null;
}

// ------------------------------------------------------------------ picker

function Swatch({ colors, scheme }: { colors?: Colors; scheme: Theme["scheme"] }) {
  if (!colors) {
    return (
      <span className="swatch split" aria-hidden="true">
        <span style={{ background: LAYR_LIGHT.canvas }}>
          <i style={{ background: LAYR_LIGHT.accent }} />
        </span>
        <span style={{ background: LAYR_DARK.canvas }}>
          <i style={{ background: LAYR_DARK.accent }} />
        </span>
      </span>
    );
  }
  return (
    <span className="swatch" data-scheme={scheme} aria-hidden="true" style={{ background: colors.canvas, boxShadow: `inset 0 0 0 1px ${colors.line}` }}>
      <i style={{ background: colors.panel, boxShadow: `0 0 0 1px ${colors.line}` }} />
      <i style={{ background: colors.accent }} />
      <i style={{ background: colors.ink }} />
    </span>
  );
}

const LABELS: Record<Token, string> = {
  canvas: "Page",
  panel: "Panels",
  sunken: "Wells and bars",
  line: "Lines",
  lineStrong: "Strong lines",
  ink: "Text",
  muted: "Secondary text",
  faint: "Hints",
  accent: "Accent and links",
  action: "Buttons",
  onAccent: "Button labels",
  ember: "Ember",
  gold: "Gold",
  teal: "Teal",
  violet: "Violet",
  danger: "Errors",
  warn: "Warnings",
};

const GROUPS: Array<{ name: string; tokens: Token[] }> = [
  { name: "Surfaces", tokens: ["canvas", "panel", "sunken", "line", "lineStrong"] },
  { name: "Text", tokens: ["ink", "muted", "faint"] },
  { name: "Accent", tokens: ["accent", "action", "onAccent"] },
  { name: "Highlights and signals", tokens: ["ember", "gold", "teal", "violet", "danger", "warn"] },
];

function TokenRow({ token, value, onSet }: { token: Token; value: string; onSet: (t: Token, v: string) => void }) {
  return (
    <div className="custom-row">
      <label className="custom-chip" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onSet(token, e.target.value)} aria-label={LABELS[token]} />
      </label>
      <span className="custom-name">{LABELS[token]}</span>
      <input
        className="custom-hex"
        type="text"
        size={7}
        defaultValue={value}
        key={value}
        spellCheck={false}
        onBlur={(e) => onSet(token, e.target.value.trim())}
        onKeyDown={(e) => e.key === "Enter" && onSet(token, (e.target as HTMLInputElement).value.trim())}
        aria-label={`${LABELS[token]}, hex`}
      />
    </div>
  );
}

/** A small page in the palette being edited, so every choice is judged in place. */
function Specimen({ c }: { c: Colors }) {
  return (
    <div className="specimen" style={{ background: c.canvas, borderColor: c.line }}>
      <div className="specimen-card" style={{ background: c.panel, borderColor: c.line }}>
        <b style={{ color: c.ink }}>Order 1042</b>
        <span style={{ color: c.muted }}>Two items, ships Monday</span>
        <span style={{ color: c.faint }}>Updated 2 min ago</span>
        <div className="specimen-well" style={{ background: c.sunken, borderColor: c.lineStrong }}>
          <i style={{ background: c.ember }} />
          <i style={{ background: c.gold }} />
          <i style={{ background: c.teal }} />
          <i style={{ background: c.violet }} />
          <span style={{ color: c.danger }}>1 error</span>
          <span style={{ color: c.warn }}>2 warnings</span>
        </div>
        <div className="specimen-actions">
          <span className="specimen-btn" style={{ background: c.action, color: c.onAccent }}>
            Track order
          </span>
          <span style={{ color: c.accent }}>View receipt</span>
        </div>
      </div>
    </div>
  );
}

function CustomEditor({ start, scheme: scheme0, onChange, onSave, onBack }: { start: Colors; scheme: "light" | "dark"; onChange: (c: Colors, s: "light" | "dark") => void; onSave: (c: Colors, s: "light" | "dark") => void; onBack: () => void }) {
  const [colors, setColors] = useState<Colors>(start);
  const [scheme, setScheme] = useState<"light" | "dark">(scheme0);
  useEffect(() => onChange(colors, scheme), [colors, scheme, onChange]);
  const set = useCallback((t: Token, v: string) => {
    const hex = v.startsWith("#") ? v : `#${v}`;
    if (/^#[0-9a-f]{6}$/i.test(hex)) setColors((c) => ({ ...c, [t]: hex.toLowerCase() }));
  }, []);
  const results = CHECKS.map((c) => ({ ...c, ratio: contrast(colors[c.fg], colors[c.bg]) }));
  const bad = results.filter((r) => r.ratio < r.min);
  return (
    <div className="custom">
      <div className="custom-head">
        <button type="button" className="custom-back" onClick={onBack}>
          ← Themes
        </button>
        <div className="seg" role="group" aria-label="Base">
          {(["light", "dark"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={scheme === s} onClick={() => setScheme(s)}>
              {s === "light" ? "Light base" : "Dark base"}
            </button>
          ))}
        </div>
      </div>
      <div className="custom-body">
        <div className="custom-tokens">
          {GROUPS.map((g) => (
            <section key={g.name} className="custom-group">
              <h3>{g.name}</h3>
              {g.tokens.map((t) => (
                <TokenRow key={t} token={t} value={colors[t]} onSet={set} />
              ))}
            </section>
          ))}
        </div>
        <aside className="custom-side">
          <Specimen c={colors} />
          <ul className="contrast" aria-label="Readability">
            {results.map((r) => (
              <li key={r.what} data-ok={r.ratio >= r.min ? "" : undefined} data-bad={r.ratio < 3 ? "" : undefined} title={r.ratio >= r.min ? "Readable" : r.ratio < 3 ? "Unreadable" : `Needs ${r.min}:1`}>
                {r.ratio >= r.min ? <Check size={14} weight="bold" /> : r.ratio < 3 ? <WarningCircle size={14} weight="fill" /> : <Warning size={14} weight="fill" />}
                <span>{r.what}</span>
                <b>{r.ratio.toFixed(1)}:1</b>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <div className="custom-foot">
        <span data-bad={bad.length ? "" : undefined}>{bad.length ? `${bad.length} pairing${bad.length === 1 ? "" : "s"} will be hard to read.` : "Every pairing is readable."}</span>
        <button type="button" className="play-btn primary" onClick={() => onSave(colors, scheme)}>
          Use this theme
        </button>
      </div>
    </div>
  );
}

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState("layr");
  const [sel, setSel] = useState(0);
  const [custom, setCustom] = useState<{ colors: Colors; scheme: "light" | "dark" } | null>(null);
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const s = saved();
    if (!s) return;
    // Re-apply (and re-save) so a palette stored by an earlier version of this page gets current CSS.
    const t = THEMES.find((x) => x.id === s.id) ?? { id: s.id, name: s.id, note: "", scheme: s.scheme, colors: s.colors };
    apply(t, s.colors);
    save(t, s.colors);
    setCurrent(s.id);
    if (s.id === "custom") setCustom({ colors: s.colors, scheme: s.scheme });
  }, []);

  const all = useMemo<Theme[]>(() => [...THEMES, { id: "custom", name: "Custom", note: custom ? "Your palette. Edit it" : "Set every colour yourself, with readability checks", scheme: custom?.scheme ?? "dark", colors: custom?.colors }], [custom]);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? all.filter((t) => `${t.name} ${t.note}`.toLowerCase().includes(n)) : all;
  }, [all, q]);

  const restore = useCallback(() => {
    const s = saved();
    const t = all.find((x) => x.id === (s?.id ?? "layr")) ?? (THEMES[0] as Theme);
    apply(t, s?.colors);
  }, [all]);

  const show = () => {
    setOpen(true);
    setEditing(false);
    setQ("");
    setSel(Math.max(0, all.findIndex((t) => t.id === current)));
    requestAnimationFrame(() => input.current?.focus());
  };
  const close = (keep = false) => {
    if (!keep) restore();
    setOpen(false);
    opener.current?.focus();
  };
  const choose = (t: Theme) => {
    if (t.id === "custom") {
      setEditing(true);
      return;
    }
    apply(t);
    save(t);
    setCurrent(t.id);
    close(true);
  };

  // Escape steps back from the editor, then closes (restoring the theme), wherever focus is.
  const escRef = useRef<() => void>(() => {});
  escRef.current = () => {
    if (editing) setEditing(false);
    else close();
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      escRef.current();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  // Moving through the list previews each theme; Escape puts back what was there.
  useEffect(() => {
    if (!open || editing) return;
    const t = list[sel];
    if (t && t.id !== "custom") apply(t);
  }, [open, editing, sel, list]);

  const onEdit = useCallback((colors: Colors, scheme: "light" | "dark") => apply({ id: "custom", name: "Custom", note: "", scheme, colors }), []);

  // Only needed once the editor opens, which happens in the browser (never while prerendering).
  const start = custom ?? (() => {
    const s = typeof window === "undefined" ? null : saved();
    const dark = s ? s.scheme === "dark" : typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
    return { colors: s?.colors ?? (dark ? LAYR_DARK : LAYR_LIGHT), scheme: (s?.scheme ?? (dark ? "dark" : "light")) as "light" | "dark" };
  })();

  return (
    <>
      <button ref={opener} type="button" className="icon-btn" onClick={show} aria-label="Theme" title="Theme" aria-haspopup="dialog">
        <PaletteIcon size={18} />
      </button>
      {open ? (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes from the dialog itself
        <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div
            className="palette themes"
            role="dialog"
            aria-modal="true"
            aria-label="Theme"
          >
            {editing ? (
              <CustomEditor
                start={start.colors}
                scheme={start.scheme}
                onChange={onEdit}
                onBack={() => {
                  setEditing(false);
                  restore();
                }}
                onSave={(colors, scheme) => {
                  const t: Theme = { id: "custom", name: "Custom", note: "", scheme, colors };
                  apply(t);
                  save(t);
                  setCustom({ colors, scheme });
                  setCurrent("custom");
                  close(true);
                }}
              />
            ) : (
              <>
                <div className="palette-input">
                <PaletteIcon size={18} />
                <input
                  ref={input}
                  placeholder="Choose a theme"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setSel(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSel((s) => Math.min(list.length - 1, s + 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSel((s) => Math.max(0, s - 1));
                    } else if (e.key === "Enter" && list[sel]) {
                      e.preventDefault();
                      choose(list[sel] as Theme);
                    }
                  }}
                  aria-label="Filter themes"
                />
                </div>
                <ul className="palette-list" role="listbox" aria-label="Themes">
                  {list.map((t, i) => (
                    // biome-ignore lint/a11y/useKeyWithClickEvents: the input above handles the keyboard
                    <li key={t.id} role="option" aria-selected={i === sel} className="palette-item theme-item" onMouseEnter={() => setSel(i)} onClick={() => choose(t)}>
                      <Swatch colors={t.colors} scheme={t.scheme} />
                      <span className="theme-text">
                        <b>{t.name}</b>
                        <span>{t.note}</span>
                      </span>
                      {t.id === current ? <Check size={16} weight="bold" className="theme-on" /> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
