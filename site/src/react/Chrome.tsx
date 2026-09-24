/**
 * The small interactive pieces of the site chrome that LAYR reaches through interop: icons
 * (Phosphor), the theme switch, and the command palette (⌘K).
 */
import {
  ArrowRight,
  BookOpen,
  ChatsCircle,
  CaretDown,
  CaretRight,
  Check,
  Copy,
  Cube,
  GithubLogo,
  Hash,
  List,
  MagnifyingGlass,
  Monitor,
  Moon,
  Package,
  Play,
  Plug,
  Sparkle,
  Sun,
  Terminal,
  WarningCircle,
  X,
} from "@phosphor-icons/react/ssr";
import { router } from "@dynshift/layr/runtime";
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react";

const ICONS: Record<string, ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill" }>> = {
  arrow: ArrowRight,
  book: BookOpen,
  caretDown: CaretDown,
  caretRight: CaretRight,
  check: Check,
  copy: Copy,
  cube: Cube,
  github: GithubLogo,
  hash: Hash,
  menu: List,
  search: MagnifyingGlass,
  package: Package,
  play: Play,
  plug: Plug,
  chat: ChatsCircle,
  sparkle: Sparkle,
  terminal: Terminal,
  warning: WarningCircle,
  close: X,
};

/** A Phosphor icon by name (decorative; the control around it carries the label). */
export function Icon({ name, size = 16, weight = "regular" }: { name: string; size?: number; weight?: "regular" | "bold" | "fill" }) {
  const C = ICONS[name];
  return C ? (
    <span aria-hidden="true" style={{ display: "inline-flex", flex: "none" }}>
      <C size={size} weight={weight} />
    </span>
  ) : null;
}

// ------------------------------------------------------------------ theme

type Theme = "system" | "light" | "dark";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem("layr-theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** Cycles system → light → dark. The choice is this reader's convenience, kept in their browser. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => setTheme(readTheme()), []);
  const next = () => {
    const t: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(t);
    try {
      if (t === "system") localStorage.removeItem("layr-theme");
      else localStorage.setItem("layr-theme", t);
    } catch {}
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  };
  const C = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label = theme === "system" ? "Theme: system" : theme === "light" ? "Theme: light" : "Theme: dark";
  return (
    <button type="button" className="icon-btn" onClick={next} aria-label={`${label}. Switch theme`} title={label}>
      <C size={18} />
    </button>
  );
}

// ------------------------------------------------------------------ command palette

interface Item {
  t: string;
  s: string;
  h: string;
  k: string;
}

const KIND_ICON: Record<string, ComponentType<{ size?: number }>> = { page: BookOpen, section: Hash, widget: Cube, diagnostic: WarningCircle, command: Terminal };
const KIND_LABEL: Record<string, string> = { page: "Page", section: "Section", widget: "Widget", diagnostic: "Diagnostic", command: "Command" };

function score(item: Item, q: string): number {
  const t = item.t.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80 - t.length / 100;
  const words = t.split(/[\s.·:/-]+/);
  if (words.some((w) => w.startsWith(q))) return 60;
  if (t.includes(q)) return 40;
  if (item.s.toLowerCase().includes(q)) return 15;
  return 0;
}

let listeners: Array<() => void> = [];
/** Opens the palette from anywhere (the search button, a LAYR `.fnc`). */
export function openSearch() {
  for (const l of listeners) l();
}

/** The search field in the top bar: opens the palette; ⌘K / Ctrl+K / "/" also open it. */
export function SearchButton({ compact = false }: { compact?: boolean }) {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  if (compact)
    return (
      <button type="button" className="icon-btn" onClick={openSearch} aria-label="Search">
        <MagnifyingGlass size={18} />
      </button>
    );
  return (
    <button type="button" className="search-btn" onClick={openSearch}>
      <MagnifyingGlass size={16} />
      <span>Search docs</span>
      <kbd>{mac ? "⌘" : "Ctrl"}</kbd>
      <kbd>K</kbd>
    </button>
  );
}

export function Palette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<Element | null>(null);

  const show = useCallback(() => {
    opener.current = document.activeElement;
    setOpen(true);
    setQ("");
    setSel(0);
    if (!items) void import("virtual:site/search").then((m) => setItems(m.default));
  }, [items]);

  useEffect(() => {
    listeners.push(show);
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      listeners = listeners.filter((l) => l !== show);
      window.removeEventListener("keydown", onKey);
    };
  }, [show]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  const results = useMemo(() => {
    if (!items) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return items.filter((i) => i.k === "page").slice(0, 12);
    return items
      .map((i) => ({ i, s: score(i, needle) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .map((x) => x.i);
  }, [items, q]);

  const close = () => {
    setOpen(false);
    (opener.current as HTMLElement | null)?.focus?.();
  };
  const go = (item: Item) => {
    setOpen(false);
    const [path, hash] = item.h.split("#") as [string, string | undefined];
    if (path !== router.location.peek().path) router.go(path);
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }), 60);
  };

  if (!open) return null;
  return (
    <div
      className="palette-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search the LAYR docs">
        <div className="palette-input">
          <MagnifyingGlass size={18} />
          <input
            ref={input}
            value={q}
            placeholder="Search pages, widgets, diagnostics, commands"
            aria-label="Search"
            aria-controls="palette-results"
            aria-activedescendant={results[sel] ? `pr-${sel}` : undefined}
            role="combobox"
            aria-expanded="true"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(results.length - 1, s + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === "Enter" && results[sel]) go(results[sel] as Item);
            }}
          />
          <button type="button" className="icon-btn" onClick={close} aria-label="Close search">
            <X size={16} />
          </button>
        </div>
        <div className="palette-list" id="palette-results" role="listbox" aria-label="Results">
          {!items ? <div className="palette-empty">Loading the index</div> : null}
          {items && !results.length ? <div className="palette-empty">Nothing matches “{q}”. Try a widget name like Row, or a code like L3101.</div> : null}
          {!q.trim() && items ? <div className="palette-group">Pages</div> : null}
          {results.map((r, i) => {
            const K = KIND_ICON[r.k] ?? BookOpen;
            return (
              <button
                type="button"
                key={`${r.h}-${r.t}`}
                id={`pr-${i}`}
                role="option"
                aria-selected={i === sel}
                className="palette-item"
                onMouseMove={() => setSel(i)}
                onClick={() => go(r)}
              >
                <K size={16} />
                <span>
                  {r.t}
                  {r.s ? <small>{r.s}</small> : null}
                </span>
                <span className="kind">{KIND_LABEL[r.k] ?? ""}</span>
              </button>
            );
          })}
        </div>
        <div className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to move
          </span>
          <span>
            <kbd>↵</kbd> to open
          </span>
          <span>
            <kbd>esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
