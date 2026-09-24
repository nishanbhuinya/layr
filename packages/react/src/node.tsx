/**
 * `N`: renders one LAYR object. Static styling arrives as class names compiled to CSS; dynamic
 * config, injected layers and per-frame values are lowered here at runtime with the same lowering
 * the compiler uses.
 */
import { type Decls, lower, PRIMARY_ACTIONS, runtimeWidget, size as makeSize } from "@layr-internal/model";
import { type Action, atFrame, registry, router, run, type Signal } from "@layr-internal/runtime";
import { Children, type CSSProperties, createElement, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { applyMotion, exitAnimation, type MotionSpec } from "./motion.ts";
import { exitSpecs } from "./presence.tsx";
import { useTrack } from "./track.ts";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface NodeProps {
  /** Widget name. */
  w: string;
  /** Static classes (compiled CSS). */
  c?: string;
  /** Full config when anything is dynamic. */
  d?: Record<string, unknown>;
  /** Static config (addressable objects and widget roots). */
  s?: Record<string, unknown>;
  /** Behaviour/content keys when the config is static. */
  b?: Record<string, unknown>;
  /** Address for Export/Extract/Inject. */
  a?: string;
  /** Lookup path, when the project compiles with `inspect: true`. */
  p?: string;
  /** Source line of the object, with `inspect: true`. */
  ln?: number;
  /** Instance address prefix inside widgets. */
  ip?: string;
  /** Outer config from a widget's usage site (margin, w, flex…). */
  o?: Record<string, unknown>;
  /** Tag override (Text types). */
  t?: string;
  /** Static attributes. */
  x?: Record<string, string | number | boolean>;
  /** Accessibility overrides. */
  ar?: Record<string, unknown>;
  /** Events. */
  on?: Record<string, Action>;
  /** Positional value (Gap size, Icon name). */
  v?: Record<string, unknown>;
  /** Motion spec for Animate. */
  m?: MotionSpec;
  /** Presets. */
  pr?: string[];
  /** Row adaptation needed at runtime. */
  ad?: number;
  /** Events from a widget's usage site, applied to the widget's root. */
  oe?: Record<string, Action>;
  children?: ReactNode;
  [slot: string]: unknown;
}

/** Resize observation that reacts on the next frame, so layout changes never loop inside the observer. */
function observeResize(targets: Element[], cb: () => void): () => void {
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      cb();
    });
  };
  const ro = new ResizeObserver(schedule);
  for (const t of targets) ro.observe(t);
  return () => {
    ro.disconnect();
    if (frame) cancelAnimationFrame(frame);
  };
}

const presets = new Map<string, Map<string, Record<string, unknown>>>();


/** Registers a preset: `Preset(.name(primary) .for(Button) .config(...))`. */
export function preset(widgetName: string, name: string, cfg: Record<string, unknown>) {
  const m = presets.get(widgetName) ?? new Map();
  m.set(name, cfg);
  presets.set(widgetName, m);
}

/** The neutral `.preset(default)` for interactive widgets: visible, accessible, unopinionated. */
const DEFAULT_PRESET: Record<string, Decls> = {
  Button: { padding: "0.5em 1em", "border-radius": "0.5em", border: "1px solid currentColor", background: "transparent", "font-weight": "600", "line-height": "1.2" },
  Input: { padding: "0.5em 0.75em", "border-radius": "0.4em", border: "1px solid color-mix(in srgb, currentColor 35%, transparent)" },
  Select: { padding: "0.4em 0.6em", "border-radius": "0.4em", border: "1px solid color-mix(in srgb, currentColor 35%, transparent)" },
  Link: { "text-decoration": "underline", "text-underline-offset": "0.2em" },
};

function styleFrom(decls: Decls): CSSProperties {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(decls)) {
    if (k.startsWith("--")) out[k] = v;
    else out[k.replace(/^-(webkit|moz|ms)-/, (_m, p: string) => `${p.charAt(0).toUpperCase()}${p.slice(1)}-`).replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = v;
  }
  return out as CSSProperties;
}

function isPerFrame(v: unknown): v is { $: "frames"; values: Record<string, unknown>; step: boolean } {
  return typeof v === "object" && v !== null && (v as { $?: string }).$ === "frames";
}

function unwrap(v: unknown): unknown {
  if (typeof v === "object" && v !== null && typeof (v as Signal<unknown>).get === "function" && typeof (v as Signal<unknown>).subscribe === "function") return (v as Signal<unknown>).get();
  return v;
}

/** Renders the icon registered under `name` (see `icons()`). */
const iconSets = new Map<string, string>();
export function icons(set: Record<string, string>) {
  for (const [k, v] of Object.entries(set)) iconSets.set(k, v);
}

export function N(props: NodeProps): ReactNode {
  const t = useTrack();
  const lifetime = useRef({ alive: true });
  const el = useRef<HTMLElement | null>(null);
  const [stacked, setStacked] = useState(false);
  const [chosen, setChosen] = useState(0);
  const motionRef = useRef<MotionSpec>({});
  const fieldId = useId();
  try {
    const { w, c, d, s, b, a, ip, o, x, ar, v, m, pr, ad, oe } = props;
    // A caller's `.fnc` on a custom widget arrives as `press`; it runs the root's primary action.
    const primary = PRIMARY_ACTIONS[w] ?? "press";
    const outer = oe ? Object.fromEntries(Object.entries(oe).map(([k, fn]) => [k === "press" ? primary : k, fn])) : undefined;
    const on = outer ? { ...outer, ...(props.on ?? {}) } : props.on;
    const def = runtimeWidget(w);
    const instanceAddr = a && ip ? `${ip}>${a.split("::")[1]}` : undefined;

    // ---- effective config
    let cfg: Record<string, unknown> | null = d ? { ...d } : null;
    if (o && Object.keys(o).length) cfg = { ...(s ?? {}), ...(cfg ?? {}), ...o };
    const overridden = a ? [...registry.overriddenKeys(a), ...(instanceAddr ? registry.overriddenKeys(instanceAddr) : [])] : [];
    if (a && overridden.length) {
      const base: Record<string, unknown> = { ...(s ?? {}), ...(b ?? {}), ...(cfg ?? {}) };
      for (const k of overridden) {
        base[k] = registry.resolve(a, k, base[k]);
        if (instanceAddr) base[k] = registry.resolve(instanceAddr, k, base[k]);
      }
      cfg = base;
    }
    if (cfg) for (const [k, val] of Object.entries(cfg)) cfg[k] = unwrap(isPerFrame(val) ? atFrame(val) : val);
    if (v) cfg = { ...(cfg ?? s ?? {}), ...v };

    const beh: Record<string, unknown> = { ...(b ?? {}), ...(cfg ?? {}) };
    let className = c ?? "";
    let style: CSSProperties | undefined;
    let tag = props.t ?? def?.tag ?? "div";
    let attrs: Record<string, unknown> = { ...(x ?? {}) };
    if (cfg) {
      const l = lower(w, cfg);
      className = [...new Set([...(c ?? "").split(" ").filter(Boolean), ...l.classes])].join(" ");
      style = styleFrom(l.decls);
      tag = l.tag;
      attrs = { ...attrs, ...l.attrs };
    }
    for (const p of pr ?? []) {
      const custom = presets.get(w)?.get(p);
      if (custom) {
        const l = lower(w, custom);
        style = { ...styleFrom(l.decls), ...(style ?? {}) };
      } else if (p === "default" && DEFAULT_PRESET[w]) style = { ...styleFrom(DEFAULT_PRESET[w] as Decls), ...(style ?? {}) };
    }
    // In an adapting row, fill children keep their min-content (a word, a code line, a fixed part),
    // so "too narrow" overflows and stacks instead of squeezing content (an explicit minW still wins).
    if (ad) className += stacked ? " l-adapt l-stacked" : " l-adapt";
    if (typeof beh.className === "string" && beh.className) className += ` ${beh.className}`;

    // ---- events
    const handlers: Record<string, unknown> = {};
    const fire = (name: string, ...args: unknown[]) => {
      const h = on?.[name];
      if (h) void run(h, args, lifetime.current);
    };
    if (on) {
      if (on.press || on.tap) handlers.onClick = (e: Event) => fire(on.press ? "press" : "tap", undefined, e);
      if (on.hover) handlers.onPointerEnter = (e: Event) => fire("hover", undefined, e);
      if (on.hoverEnd) handlers.onPointerLeave = (e: Event) => fire("hoverEnd", undefined, e);
      if (on.focus) handlers.onFocus = (e: Event) => fire("focus", undefined, e);
      if (on.blur) handlers.onBlur = (e: Event) => fire("blur", undefined, e);
      if (on.key) handlers.onKeyDown = (e: KeyboardEvent) => fire("key", e.key, e);
      if ((on.press || on.tap) && tag !== "button" && tag !== "a" && tag !== "input") {
        attrs.role ??= "button";
        attrs.tabIndex ??= 0;
        handlers.onKeyDown = (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fire(on.press ? "press" : "tap", undefined, e);
          }
          if (on.key) fire("key", e.key, e);
        };
      }
    }
    for (const [k, val] of Object.entries(ar ?? {})) attrs[k === "label" ? "aria-label" : k === "role" ? "role" : k === "hidden" ? "aria-hidden" : k === "live" ? "aria-live" : `aria-${k}`] = val;

    // ---- lifecycle, measurement, publishing
    useIsoLayoutEffect(() => {
      lifetime.current.alive = true;
      if (on?.mount) fire("mount");
      return () => {
        lifetime.current.alive = false;
        if (on?.unmount) void run(on.unmount, [], { alive: true });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useIsoLayoutEffect(() => {
      if (!a) return;
      const declared = { ...(s ?? {}), ...(b ?? {}), ...(d ?? {}) };
      for (const [k, val] of Object.entries(declared)) {
        registry.publish(a, k, val);
        if (instanceAddr) registry.publish(instanceAddr, k, val);
      }
    });
    useIsoLayoutEffect(() => {
      const node = el.current;
      if (!node || (!a && !ad)) return;
      const measure = () => {
        const r = node.getBoundingClientRect();
        if (a) {
          const unit = Number.parseFloat(getComputedStyle(node).getPropertyValue("--ds")) / 1000 || 1;
          const sz = makeSize(r.width / unit, r.height / unit);
          registry.setRendered(a, "size", sz);
          if (instanceAddr) registry.setRendered(instanceAddr, "size", sz);
        }
        if (ad) adapt(node, setStacked);
      };
      measure();
      return observeResize(ad && node.parentElement ? [node, node.parentElement] : [node], measure);
    }, [a, ad]);
    motionRef.current = { ...(m ?? {}), duration: (beh.duration as number | undefined) ?? m?.duration, ease: (beh.ease as MotionSpec["ease"]) ?? m?.ease, always: beh.motion === "always" };
    useIsoLayoutEffect(() => {
      if (w === "Animate" && el.current) {
        const wrapper = el.current;
        exitSpecs.set(wrapper, () => exitAnimation(wrapper.firstElementChild as HTMLElement | null, motionRef.current));
        return applyMotion(wrapper, () => motionRef.current);
      }
      return undefined;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useIsoLayoutEffect(() => {
      if (w !== "Adapt" || !el.current) return undefined;
      const node = el.current;
      const pick = () => {
        const avail = node.clientWidth;
        const measurers = [...(node.querySelector("[data-adapt-measure]")?.children ?? [])] as HTMLElement[];
        let idx = measurers.findIndex((m) => m.scrollWidth <= avail + 0.5);
        if (idx < 0) idx = Math.max(0, measurers.length - 1);
        setChosen(idx);
      };
      pick();
      return observeResize([node], pick);
    }, [w]);
    useIsoLayoutEffect(() => {
      if ((w === "Mask" || w === "Subtract") && el.current) return composite(el.current, w, (beh.mode as string) ?? "alpha");
      return undefined;
    });

    // ---- children and slots
    let children: ReactNode = props.children;
    const setRef = (n: HTMLElement | null) => {
      el.current = n;
    };

    switch (w) {
      case "Button": {
        if (children === undefined && beh.label !== undefined) children = String(beh.label);
        if (beh.disabled) attrs.disabled = true;
        attrs.type = beh.submit ? "submit" : "button";
        break;
      }
      case "Link": {
        const raw = beh.href as string | undefined;
        // A root-relative href is an in-app path: it gets the base and navigates without a reload.
        const internal = !beh.external && typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//");
        const to = (beh.to as string | undefined) ?? (internal ? raw : undefined);
        const href = to ? router.hrefFor(to) : (raw ?? "#");
        attrs.href = href;
        if (to) {
          // aria-current marks the page itself; data-active marks the section it heads (/docs for /docs/x).
          const here = router.location.get().path;
          const path = router.hrefFor(to).replace(/[?#].*$/, "").replace(/\/$/, "").replace(/^$/, "/");
          if (here === path) attrs["aria-current"] = "page";
          if (here === path || (path !== "/" && here.startsWith(`${path}/`))) attrs["data-active"] = "";
        }
        if (beh.external) {
          attrs.target = "_blank";
          attrs.rel = "noopener noreferrer";
        }
        if (children === undefined && beh.label !== undefined) children = String(beh.label);
        const press = handlers.onClick as ((e: Event) => void) | undefined;
        handlers.onClick = (e: MouseEvent) => {
          press?.(e);
          if (to && !beh.external && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            router.go(to);
          }
        };
        break;
      }
      case "Text":
      case "Span":
        if (typeof children === "string" && beh.type === "code") tag = "code";
        break;
      case "Image":
      case "Svg": {
        if (beh.src !== undefined) attrs.src = String(beh.src);
        if (beh.decorative) {
          attrs.alt = "";
          attrs["aria-hidden"] = true;
        } else if (beh.alt !== undefined) attrs.alt = String(beh.alt);
        children = undefined;
        break;
      }
      case "Video": {
        for (const k of ["src", "poster", "autoplay", "loop", "muted", "controls"]) if (beh[k] !== undefined) attrs[k === "autoplay" ? "autoPlay" : k] = beh[k];
        if (beh.autoplay) attrs.muted = true;
        attrs.playsInline = true;
        attrs.controls ??= true;
        children = beh.captions ? createElement("track", { kind: "captions", src: String(beh.captions), default: true }) : undefined;
        break;
      }
      case "Icon": {
        const name = String(beh.name ?? "");
        const svg = iconSets.get(name);
        if (beh.label) {
          attrs.role = "img";
          attrs["aria-label"] = String(beh.label);
        } else attrs["aria-hidden"] = true;
        if (svg) attrs.dangerouslySetInnerHTML = { __html: svg };
        children = undefined;
        break;
      }
      case "Gap":
        children = undefined;
        attrs["aria-hidden"] = true;
        break;
      case "Input":
      case "Toggle":
      case "Select":
      case "Slider":
        return field(w, beh, className, style, on, lifetime.current, setRef, fieldId);
      case "Form": {
        const submit = on?.submit;
        handlers.onSubmit = (e: Event) => {
          e.preventDefault();
          if (submit) void run(submit, [undefined, e], lifetime.current);
        };
        break;
      }
      case "Overlay":
        return overlay(beh, className, style, children, on, lifetime.current, attrs);
      case "Scaffold": {
        const bar = props.bar as ReactNode;
        const footer = props.footer as ReactNode;
        if (beh.scroll === "none" || beh.fit === "contain") className += " l-fit-contain";
        children = [
          bar ? createElement("header", { key: "bar", className: "l l-col l-bar", style: { position: "sticky", top: 0, zIndex: 10 } }, bar) : null,
          createElement("main", { key: "body", className: "l l-col", style: { flex: "1 1 auto", display: "flex", flexDirection: "column", alignItems: "stretch" } }, children),
          footer ? createElement("footer", { key: "footer", className: "l l-col" }, footer) : null,
        ];
        break;
      }
      case "Blur": {
        if (beh.type === "progressive") {
          children = [progressiveBlur(beh), createElement("div", { key: "c", style: { position: "relative" } }, children)];
          style = { ...(style ?? {}), position: "relative", backdropFilter: undefined, WebkitBackdropFilter: undefined } as CSSProperties;
        }
        break;
      }
      case "Adapt": {
        // Candidates render hidden for measurement; the first one whose natural width fits is shown.
        const kids = Children.toArray(children);
        style = { ...(style ?? {}), position: "relative" };
        children = [
          createElement("div", { key: "shown", "data-adapt-shown": chosen, style: { display: "contents" } }, kids[Math.min(chosen, kids.length - 1)]),
          createElement(
            "div",
            { key: "measure", "aria-hidden": true, inert: true, "data-adapt-measure": "", style: { position: "absolute", top: 0, left: 0, visibility: "hidden", pointerEvents: "none", height: 0, overflow: "hidden" } },
            kids.map((k, i) => createElement("div", { key: i, style: { width: "max-content" } }, k)),
          ),
        ];
        break;
      }
      case "Animate":
      case "Focus":
        className = `${className} l-pass`;
        style = { ...(style ?? {}), display: "contents" };
        if (w === "Focus" && beh.auto) queueMicrotask(() => (el.current?.querySelector("input,button,select,textarea,a,[tabindex]") as HTMLElement | null)?.focus());
        break;
    }

    return createElement(tag, { ref: setRef, className, style, ...handlers, ...attrs, "data-l": w, "data-a": a, "data-path": props.p, "data-line": props.ln }, children);
  } finally {
    t.done();
  }
}

/** Unstack only with a little room to spare, so sub-pixel rounding cannot flip a row back and forth. */
const UNSTACK_SLACK = 4;

/**
 * Runtime Row adaptation: stacks when the row's content cannot fit, unstacks when it fits again.
 * The width the row needed side by side is cached when it stacks, and compared with the room the
 * row really has: its own width when it fills its parent (stacking does not change that), else its
 * parent's content box. Comparing against anything wider (a padded parent) oscillates.
 */
function adapt(node: HTMLElement, setStacked: (v: boolean) => void) {
  const stacked = node.classList.contains("l-stacked");
  if (!stacked) {
    if (node.scrollWidth > node.clientWidth + 1) {
      node.dataset.stackAt = String(node.scrollWidth);
      setStacked(true);
    }
    return;
  }
  const need = Number(node.dataset.stackAt ?? "0");
  let avail = node.clientWidth;
  if (!node.classList.contains("l-wfill") && node.parentElement) {
    const p = node.parentElement;
    const cs = getComputedStyle(p);
    avail = p.clientWidth - (Number.parseFloat(cs.paddingLeft) || 0) - (Number.parseFloat(cs.paddingRight) || 0);
  }
  if (avail >= need + UNSTACK_SLACK) setStacked(false);
}

function field(
  w: string,
  beh: Record<string, unknown>,
  className: string,
  style: CSSProperties | undefined,
  on: Record<string, Action> | undefined,
  lifetime: { alive: boolean },
  setRef: (n: HTMLElement | null) => void,
  id: string,
): ReactNode {
  const change = on?.change;
  const emit = (value: unknown, e: Event) => {
    if (change) void run(change, [value, e], lifetime);
  };
  const label = beh.label !== undefined ? String(beh.label) : undefined;
  // Layout keys size the field; paint, padding, border and corners style the control itself.
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style ?? {})) (/^(width|minWidth|maxWidth|margin|flex|alignSelf|opacity|--l-)/.test(k) ? outer : inner)[k] = v;
  style = outer as CSSProperties;
  let control: ReactNode;
  if (w === "Toggle") {
    control = createElement("input", {
      type: "checkbox",
      role: beh.kind === "switch" ? "switch" : undefined,
      checked: beh.value === undefined ? undefined : Boolean(beh.value),
      disabled: Boolean(beh.disabled),
      onChange: (e: Event) => emit((e.target as HTMLInputElement).checked, e),
    });
    return createElement("label", { ref: setRef, className: `${className} l-field`, style: { ...(style ?? {}), display: "inline-flex", flexDirection: "row", alignItems: "center", gap: "0.5em" }, "data-l": w }, control, label);
  }
  if (w === "Select") {
    const options = (beh.options as unknown[] | undefined) ?? [];
    control = createElement(
      "select",
      { id, value: beh.value === undefined ? undefined : String(beh.value), disabled: Boolean(beh.disabled), onChange: (e: Event) => emit((e.target as HTMLSelectElement).value, e), className: "l" },
      options.map((o) => {
        const [value, text] = Array.isArray(o) ? o : [o, o];
        return createElement("option", { key: String(value), value: String(value) }, String(text));
      }),
    );
  } else if (w === "Slider") {
    control = createElement("input", {
      id,
      type: "range",
      min: beh.min as number | undefined,
      max: beh.max as number | undefined,
      step: beh.step as number | undefined,
      value: beh.value as number | undefined,
      disabled: Boolean(beh.disabled),
      onChange: (e: Event) => emit(Number((e.target as HTMLInputElement).value), e),
      className: "l",
    });
  } else {
    const multiline = Boolean(beh.multiline);
    control = createElement(multiline ? "textarea" : "input", {
      id,
      type: multiline ? undefined : ((beh.kind as string | undefined) ?? "text"),
      value: beh.value === undefined ? undefined : String(beh.value ?? ""),
      placeholder: beh.placeholder as string | undefined,
      disabled: Boolean(beh.disabled),
      required: Boolean(beh.required),
      rows: beh.rows as number | undefined,
      onChange: (e: Event) => emit((e.target as HTMLInputElement).value, e),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Enter" && !multiline && on?.submit) void run(on.submit, [(e.target as HTMLInputElement).value, e], lifetime);
      },
      className: "l",
      style: { ...(DEFAULT_FIELD as CSSProperties), width: "100%", ...inner },
    });
  }
  return createElement("div", { ref: setRef, className: `${className} l-field`, style: { ...(style ?? {}), display: "flex", flexDirection: "column", gap: "0.25em" }, "data-l": w }, label ? createElement("label", { className: "l-label", htmlFor: id }, label) : null, control);
}

const DEFAULT_FIELD = { font: "inherit", color: "inherit" };

function overlay(beh: Record<string, unknown>, className: string, style: CSSProperties | undefined, children: ReactNode, on: Record<string, Action> | undefined, lifetime: { alive: boolean }, attrs: Record<string, unknown>): ReactNode {
  return createElement(Dialog, { beh, className, style, on, lifetime, attrs }, children);
}

function Dialog(props: { beh: Record<string, unknown>; className: string; style?: CSSProperties; on?: Record<string, Action>; lifetime: { alive: boolean }; attrs: Record<string, unknown>; children?: ReactNode }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const { beh, on, lifetime } = props;
  const open = Boolean(beh.open);
  const modal = beh.modal !== false;
  useIsoLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (modal && typeof d.showModal === "function") d.showModal();
      else d.show();
    } else if (!open && d.open) d.close();
  }, [open, modal]);
  const close = (e: Event) => {
    if (on?.close) void run(on.close, [undefined, e], lifetime);
  };
  return createElement(
    "dialog",
    {
      ref,
      className: props.className,
      style: { ...(props.style ?? {}), ...(beh.backdrop ? { "--l-backdrop": String(beh.backdrop) } : {}), margin: "auto", padding: 0, border: "none", background: "transparent", maxWidth: "none", maxHeight: "none", color: "inherit" },
      "aria-label": beh.label as string | undefined,
      "data-l": "Overlay",
      onCancel: (e: Event) => {
        e.preventDefault();
        if (beh.dismissible !== false) close(e);
      },
      onClick: (e: MouseEvent) => {
        if (e.target === ref.current && beh.dismissible !== false) close(e);
      },
      ...props.attrs,
    },
    open ? props.children : null,
  );
}

function progressiveBlur(beh: Record<string, unknown>): ReactNode {
  const values = (beh.values as number[] | undefined) ?? [0, 24];
  const [from = 0, to = 24] = values;
  const dir = (beh.direction as string[] | undefined) ?? ["topMid", "bottomMid"];
  const angle = dir[0]?.startsWith("bottom") ? "to top" : dir[0]?.endsWith("Left") ? "to right" : dir[0]?.endsWith("Right") ? "to left" : "to bottom";
  const steps = 6;
  const layers: ReactNode[] = [];
  for (let i = 0; i < steps; i++) {
    const v = from + ((to - from) * (i + 1)) / steps;
    const start = (i / steps) * 100;
    const end = ((i + 2) / steps) * 100;
    const mask = `linear-gradient(${angle}, transparent ${start}%, #000 ${Math.min(100, (start + end) / 2)}%, #000 ${Math.min(100, end)}%, transparent ${Math.min(100, end + 100 / steps)}%)`;
    layers.push(
      createElement("div", {
        key: i,
        "aria-hidden": true,
        style: { position: "absolute", inset: 0, pointerEvents: "none", backdropFilter: `blur(calc(${v} * var(--ds) / 1000))`, WebkitBackdropFilter: `blur(calc(${v} * var(--ds) / 1000))`, maskImage: mask, WebkitMaskImage: mask },
      }),
    );
  }
  return createElement("div", { key: "blur", "aria-hidden": true, style: { position: "absolute", inset: 0, pointerEvents: "none" } }, layers);
}

/** Mask and Subtract: the lowest-order layer is the mask (Mask) or the base (Subtract). */
function composite(root: HTMLElement, kind: "Mask" | "Subtract", mode: string): () => void {
  const apply = () => {
    const layers = [...root.children] as HTMLElement[];
    if (layers.length < 2) return;
    const z = (e: HTMLElement) => Number.parseInt(getComputedStyle(e).zIndex, 10) || 0;
    const sorted = [...layers].sort((a, b) => z(a) - z(b));
    const base = sorted[0] as HTMLElement;
    const rootBox = root.getBoundingClientRect();
    if (kind === "Mask") {
      const target = base.firstElementChild instanceof HTMLElement ? base.firstElementChild : base;
      const cs = getComputedStyle(target);
      const paint = cs.backgroundImage !== "none" ? cs.backgroundImage : `linear-gradient(${cs.backgroundColor}, ${cs.backgroundColor})`;
      const r = target.getBoundingClientRect();
      base.style.visibility = "hidden";
      for (const el of sorted.slice(1)) {
        el.style.maskImage = paint;
        el.style.setProperty("-webkit-mask-image", paint);
        el.style.maskSize = `${r.width}px ${r.height}px`;
        el.style.setProperty("-webkit-mask-size", `${r.width}px ${r.height}px`);
        const er = el.getBoundingClientRect();
        el.style.maskPosition = `${r.left - er.left}px ${r.top - er.top}px`;
        el.style.setProperty("-webkit-mask-position", `${r.left - er.left}px ${r.top - er.top}px`);
        el.style.maskRepeat = "no-repeat";
        el.style.setProperty("-webkit-mask-repeat", "no-repeat");
        el.style.maskMode = mode === "luminance" ? "luminance" : "alpha";
      }
    } else {
      const br = base.getBoundingClientRect();
      const rects = sorted
        .slice(1)
        .map((cut) => {
          cut.style.visibility = "hidden";
          const target = (cut.querySelector("[data-l=Container]") as HTMLElement | null) ?? cut;
          const r = target.getBoundingClientRect();
          const radius = Number.parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0;
          return `<rect x='${r.left - br.left}' y='${r.top - br.top}' width='${r.width}' height='${r.height}' rx='${radius}' fill='black'/>`;
        })
        .join("");
      const svg = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${br.width}' height='${br.height}'>${rects}</svg>`)}")`;
      const img = `linear-gradient(#000 0 0), ${svg}`;
      base.style.maskImage = img;
      base.style.setProperty("-webkit-mask-image", img);
      base.style.maskComposite = "exclude";
      base.style.setProperty("-webkit-mask-composite", "xor");
      base.style.maskRepeat = "no-repeat";
      base.style.setProperty("-webkit-mask-repeat", "no-repeat");
    }
    void rootBox;
  };
  apply();
  return observeResize([root], apply);
}
