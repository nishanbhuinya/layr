/**
 * `N`: renders one LAYR object. Static styling arrives as class names compiled to CSS; dynamic
 * config, injected layers and per-frame values are lowered here at runtime with the same lowering
 * the compiler uses.
 */
import { type Decls, lengthCss, lower, PRIMARY_ACTIONS, runtimeWidget, SLOTS, size as makeSize } from "@layr-internal/model";
import { type Action, atFrame, registry, router, run, type Signal } from "@layr-internal/runtime";
import { Children, type CSSProperties, createElement, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { applyMotion, exitAnimation, type MotionSpec } from "./motion.ts";
import { resolveOverrides, usePublish } from "./declared.ts";
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
  /** Inspect mode, on a widget's root: the lookup path of the instance it renders. */
  ip2?: string;
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
  /** Object slots LAYR code extracts: published for Extract (text content always is). */
  xs?: string[];
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
    const slotNames = SLOTS[def?.name ?? w] ?? [];
    const slotValue = (k: string) => (k === slotNames[0] ? props.children : props[k]);
    const allOverridden = a ? [...registry.overriddenKeys(a), ...(instanceAddr ? registry.overriddenKeys(instanceAddr) : [])] : [];
    const overridden = allOverridden.filter((k) => !slotNames.includes(k));
    // Slots changed through E/E/I (`title.obj = 'Shipped'`): what renders in place of the written objects.
    const slots = overridden.length < allOverridden.length ? (resolveOverrides([a, instanceAddr], Object.fromEntries(slotNames.map((k) => [k, slotValue(k)])), (k) => slotNames.includes(k)) ?? {}) : {};
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
    usePublish(a ? [a, instanceAddr] : [], a ? Object.fromEntries(slotNames.map((k) => [k, slotValue(k)])) : {}, props.xs);
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
      // The room an Adapt has is what its parent gives it, not its own width: it hugs the candidate
      // it shows, so measuring itself would keep a narrow candidate forever once chosen.
      const px = (v: string) => Number.parseFloat(v) || 0;
      const room = () => {
        const p = node.parentElement;
        if (!p) return node.clientWidth;
        const cs = getComputedStyle(p);
        let w = p.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
        if (cs.display.includes("flex") && cs.flexDirection.startsWith("row")) {
          const gap = px(cs.columnGap);
          for (const c of p.children) if (c !== node && c instanceof HTMLElement && getComputedStyle(c).position !== "absolute") w -= c.getBoundingClientRect().width + gap;
        }
        return Math.max(node.clientWidth, w);
      };
      const pick = () => {
        const avail = room();
        const measurers = [...(node.querySelector("[data-adapt-measure]")?.children ?? [])] as HTMLElement[];
        let idx = measurers.findIndex((m) => m.scrollWidth <= avail + 0.5);
        if (idx < 0) idx = Math.max(0, measurers.length - 1);
        setChosen(idx);
      };
      pick();
      return observeResize(node.parentElement ? [node, node.parentElement] : [node], pick);
    }, [w]);
    useIsoLayoutEffect(() => {
      if ((w === "Mask" || w === "Subtract") && el.current) return composite(el.current, w, (beh.mode as string) ?? "alpha");
      return undefined;
    });

    // ---- children and slots
    let children = (slotNames[0] && slotNames[0] in slots ? slots[slotNames[0]] : props.children) as ReactNode;
    const named = (k: string) => (k in slots ? slots[k] : props[k]) as ReactNode;
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
        const bar = named("bar");
        const footer = named("footer");
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
          // Blurring the content: the layers sit over it. Blurring what is behind: under it.
          const over = beh.blurOn === "object";
          const content = createElement("div", { key: "c", style: { position: "relative" } }, children);
          children = over ? [content, progressiveBlur(beh, true)] : [progressiveBlur(beh, false), content];
          style = { ...(style ?? {}), position: "relative", backdropFilter: undefined, WebkitBackdropFilter: undefined, filter: undefined } as CSSProperties;
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

    return createElement(tag, { ref: setRef, className, style, ...handlers, ...attrs, "data-l": w, "data-a": a, "data-path": props.p, "data-line": props.ln, "data-instance": props.ip2 }, children);
  } finally {
    t.done();
  }
}

/** Prose may wrap once it has this many ems; narrower than its natural width up to here is squeezed. */
const COMFORT_EM = 15;

/**
 * The width a fill child needs to look right side by side: its natural (max-content) width, capped
 * at COMFORT_EM so text can still wrap, never below its min-content. Measured by laying the child
 * out once at max-content and restoring it in the same frame (nothing paints in between).
 */
function comfortable(el: HTMLElement): number {
  // A declared maxW caps what the child can want: it never needs more room than it may take.
  const cap = Number.parseFloat(getComputedStyle(el).maxWidth) || Number.POSITIVE_INFINITY;
  const { flex, width, minWidth, maxWidth } = el.style;
  el.style.flex = "0 0 auto";
  el.style.width = "max-content";
  el.style.minWidth = "0";
  el.style.maxWidth = "none";
  const natural = el.getBoundingClientRect().width;
  el.style.width = "min-content";
  const least = el.getBoundingClientRect().width;
  Object.assign(el.style, { flex, width, minWidth, maxWidth });
  const em = Number.parseFloat(getComputedStyle(el).fontSize) || 16;
  return Math.min(cap, Math.max(least, Math.min(natural, COMFORT_EM * em)));
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
    // Fitting is not enough: a fill child squeezed below its comfortable width (a button label
    // wrapping, chips one per line, prose a few words wide) also stacks the row.
    let short = 0;
    for (const child of node.children) {
      if (!(child instanceof HTMLElement) || !child.classList.contains("l-wfill")) continue;
      const want = comfortable(child);
      const has = child.getBoundingClientRect().width;
      if (has + 0.5 < want) short += want - has;
    }
    if (short > 0 || node.scrollWidth > node.clientWidth + 1) {
      node.dataset.stackAt = String(Math.ceil(node.scrollWidth + short));
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
      // Resets for <dialog> live in the base CSS layer, so the Overlay's own color/padding win.
      style: { ...(props.style ?? {}), ...(beh.backdrop ? { "--l-backdrop": String(beh.backdrop) } : {}), margin: placementMargin(beh.placement) },
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

/** `placement` as dialog margins: an edge the placement names gets 0, the others stay auto. */
function placementMargin(placement: unknown): string {
  const p = typeof placement === "string" ? placement : "mid";
  const top = p.startsWith("top") ? "0" : "auto";
  const bottom = p.startsWith("bottom") ? "0" : "auto";
  const left = /Left$/.test(p) ? "0" : "auto";
  const right = /Right$/.test(p) ? "0" : "auto";
  return `${top} ${right} ${bottom} ${left}`;
}

/** Where the progressive blur is strongest: `edge`, or the older `direction: (from, to)`. */
function blurEdge(beh: Record<string, unknown>): "bottom" | "top" | "left" | "right" {
  const e = beh.edge;
  if (e === "top" || e === "left" || e === "right" || e === "bottom") return e;
  const to = (beh.direction as string[] | undefined)?.[1];
  if (typeof to === "string") {
    if (to.startsWith("top")) return "top";
    if (to.endsWith("Left")) return "left";
    if (to.endsWith("Right")) return "right";
  }
  return "bottom";
}

const BLUR_CURVES: Record<string, (t: number) => number> = {
  linear: (t) => t,
  ease: (t) => t * t * (3 - 2 * t),
  // Stays nearly clear for the first part, then deepens quickly: what the eye reads as "soft".
  exponential: (t) => (2 ** (5 * t) - 1) / (2 ** 5 - 1),
};

/**
 * A progressive blur: `layers` thin backdrop-blur layers, each masked to a band that overlaps its
 * neighbours, with the radius rising along `curve` to `value` at `edge`. Overlapping bands hide
 * the steps; the exponential curve keeps the clear side clear. `fade` adds a colour that the edge
 * melts into. The bands cover `extent` from the edge (a length or a percentage).
 */
function progressiveBlur(beh: Record<string, unknown>, over: boolean): ReactNode {
  const edge = blurEdge(beh);
  const vals = beh.values as unknown[] | undefined;
  const radius = (v: unknown, d: number) => (typeof v === "number" ? v : typeof v === "string" && v ? Number.parseFloat(v) || d : d);
  const from = vals ? radius(vals[0], 0) : 0;
  const to = vals ? radius(vals[1], 24) : radius(beh.value, 24);
  const n = Math.max(2, Math.min(24, Math.round(Number(beh.layers ?? 8)) || 8));
  const curve = BLUR_CURVES[String(beh.curve ?? "exponential")] ?? (BLUR_CURVES.exponential as (t: number) => number);
  const dir = { bottom: "to bottom", top: "to top", left: "to left", right: "to right" }[edge];
  const size = edge === "bottom" || edge === "top" ? "height" : "width";
  const ext = beh.extent;
  const extent = typeof ext === "number" ? `calc(${ext} * var(--ds) / 1000)` : typeof ext === "string" && ext ? ext : typeof ext === "object" && ext ? lengthCss(ext as never) : "100%";
  const layers: ReactNode[] = [];
  const step = 100 / n;
  for (let i = 0; i < n; i++) {
    const v = from + (to - from) * curve((i + 1) / n);
    // Each band fades in over one step, holds for one, and fades out over the next.
    const a = Math.max(0, (i - 1) * step);
    const b = i * step;
    const c = Math.min(100, (i + 1) * step);
    const d = Math.min(100, (i + 2) * step);
    const mask = i === n - 1 ? `linear-gradient(${dir}, transparent ${a}%, #000 ${b}%)` : `linear-gradient(${dir}, transparent ${a}%, #000 ${b}%, #000 ${c}%, transparent ${d}%)`;
    const blur = `blur(calc(${v.toFixed(2)} * var(--ds) / 1000))`;
    layers.push(createElement("div", { key: i, style: { position: "absolute", inset: 0, backdropFilter: blur, WebkitBackdropFilter: blur, maskImage: mask, WebkitMaskImage: mask } }));
  }
  const fade = beh.fade === undefined || beh.fade === null ? null : typeof beh.fade === "string" ? beh.fade : ((beh.fade as { toCss?: () => string }).toCss?.() ?? String(beh.fade));
  if (fade) layers.push(createElement("div", { key: "fade", style: { position: "absolute", inset: 0, background: `linear-gradient(${dir}, transparent 20%, ${fade})` } }));
  return createElement(
    "div",
    { key: "blur", "aria-hidden": true, "data-l": "ProgressiveBlur", style: { position: "absolute", [edge]: 0, left: size === "height" ? 0 : undefined, right: size === "height" ? 0 : undefined, top: size === "width" ? 0 : undefined, bottom: size === "width" ? 0 : undefined, [size]: extent, pointerEvents: "none", zIndex: over ? 1 : undefined } },
    layers,
  );
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
