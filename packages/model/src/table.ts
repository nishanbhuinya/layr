/**
 * The minimal widget table the browser runtime needs (element tag, layout kind, aliases). The full
 * documented schema stays out of app bundles; a unit test keeps this table identical to the schema.
 */
import type { LayoutKind } from "./schema.ts";

export const RUNTIME_TABLE: Record<string, [tag: string, layout: LayoutKind, aliases?: string[]]> = {
  Container: ["div", "box", ["Box"]],
  Row: ["div", "row"],
  Column: ["div", "col", ["Col"]],
  Stack: ["div", "stack"],
  Position: ["div", "passthrough", ["Positioned"]],
  Order: ["div", "passthrough"],
  Mid: ["div", "box", ["Center", "Centre", "Cen"]],
  Align: ["div", "box"],
  Expand: ["div", "passthrough", ["Expanded", "Flexible"]],
  Gap: ["div", "leaf", ["Space", "SizedBox", "Spacer"]],
  Wrap: ["div", "wrap"],
  Grid: ["div", "grid"],
  Scroll: ["div", "scroll", ["ScrollView", "SingleChildScrollView"]],
  Aspect: ["div", "box", ["AspectRatio"]],
  SafeArea: ["div", "box"],
  Adapt: ["div", "box", ["ViewThatFits"]],
  Scaffold: ["div", "col", ["Frame"]],
  Text: ["p", "text", ["Txt"]],
  Span: ["span", "inline", ["RichText"]],
  Image: ["img", "leaf", ["Img"]],
  Svg: ["img", "leaf"],
  Icon: ["span", "leaf"],
  Video: ["video", "leaf"],
  Blur: ["div", "box"],
  Mask: ["div", "stack"],
  Subtract: ["div", "stack"],
  Clip: ["div", "box"],
  Filter: ["div", "passthrough"],
  Button: ["button", "box"],
  Link: ["a", "box"],
  Input: ["input", "leaf", ["TextField"]],
  Toggle: ["input", "leaf", ["Checkbox", "Switch"]],
  Select: ["select", "leaf"],
  Slider: ["input", "leaf"],
  Form: ["form", "col"],
  Overlay: ["dialog", "box", ["Dialog", "Popover", "Modal"]],
  Focus: ["div", "passthrough"],
  Animate: ["div", "passthrough", ["Anim"]],
};

const ALIAS: Record<string, string> = Object.fromEntries(Object.entries(RUNTIME_TABLE).flatMap(([name, row]) => (row[2] ?? []).map((a) => [a, name])));

/** Tag and layout for a widget name or alias. */
export function runtimeWidget(name: string): { name: string; tag: string; layout: LayoutKind } | undefined {
  const canonical = RUNTIME_TABLE[name] ? name : ALIAS[name];
  const row = canonical ? RUNTIME_TABLE[canonical] : undefined;
  return row && canonical ? { name: canonical, tag: row[0], layout: row[1] } : undefined;
}

/**
 * Slot names per widget, the default slot first: `Inject(... text.obj = 'Shipped')` targets one as
 * a feature. Positional values (`Gap(20)`, `Icon('star')`) are not slots. Kept equal to the schema by a test.
 */
export const SLOTS: Record<string, readonly string[]> = {
  Container: ["obj"], Row: ["objs"], Column: ["objs"], Stack: ["objs"], Position: ["obj"], Order: ["obj"], Mid: ["obj"], Align: ["obj"],
  Expand: ["obj"], Wrap: ["objs"], Grid: ["objs"], Scroll: ["obj"], Aspect: ["obj"], SafeArea: ["obj"], Adapt: ["objs"],
  Scaffold: ["body", "bar", "footer"], Text: ["obj"], Span: ["objs"], Blur: ["obj"], Mask: ["objs"], Subtract: ["objs"], Clip: ["obj"],
  Filter: ["obj"], Button: ["obj"], Link: ["obj"], Form: ["objs"], Overlay: ["obj"], Focus: ["obj"], Animate: ["obj"],
};

/** The slot a widget's feature name addresses: `obj`/`objs` name the default slot; named slots name themselves. */
export function slotKey(widgetName: string, name: string): string | null {
  const slots = SLOTS[RUNTIME_TABLE[widgetName] ? widgetName : (ALIAS[widgetName] ?? "")];
  if (!slots) return null;
  if (name === "obj" || name === "objs") return slots[0] as string;
  return slots.includes(name) ? name : null;
}

/** The event `.fnc` binds for widgets whose primary action is not `press` (kept equal to the schema by a test). */
export const PRIMARY_ACTIONS: Record<string, string> = { Input: "change", Toggle: "change", Select: "change", Slider: "change", Form: "submit" };
