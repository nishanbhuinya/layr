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

/** The event `.fnc` binds for widgets whose primary action is not `press` (kept equal to the schema by a test). */
export const PRIMARY_ACTIONS: Record<string, string> = { Input: "change", Toggle: "change", Select: "change", Slider: "change", Form: "submit" };
