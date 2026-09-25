/**
 * The LAYR schema: the single source of truth for core widgets, their config keys, slots, events,
 * aliases and documentation. The compiler, formatter, analyzer, LSP, API docs and the LAYR Skill
 * all read from here.
 */

export type TypeName =
  | "len"
  | "num"
  | "int"
  | "txt"
  | "bool"
  | "color"
  | "paint"
  | "align"
  | "axis"
  | "insets"
  | "size"
  | "time"
  | "angle"
  | "shadow"
  | "border"
  | "radius"
  | "obj"
  | "fn"
  | "motion"
  | "src"
  | "page"
  | "any"
  | "enum";

export interface KeyDef {
  name: string;
  type: TypeName;
  /** Allowed identifiers when `type` is `enum` (or extra identifiers accepted for other types, e.g. `fill`). */
  values?: readonly string[];
  default?: string;
  aliases?: readonly string[];
  doc: string;
  /** Dimension keys sort first in `.config`. */
  dimension?: boolean;
  /** Animatable by `Animate` (and interpolated by `.at` frames when numeric). */
  animatable?: boolean;
  /** Written as a modifier in canonical form (`Order(.pos(1))`). */
  modifier?: boolean;
}

export interface GroupDef {
  /** `.border(align: in, color: #000, width: 2)` */
  name: string;
  doc: string;
  /** Group key → flat config key. */
  keys: Readonly<Record<string, string>>;
}

export type SlotKind = "one" | "many" | "text";

export interface SlotDef {
  name: string;
  kind: SlotKind;
  doc: string;
  /** Positional children fill the default slot. */
  default?: boolean;
  required?: boolean;
}

export type LayoutKind = "box" | "row" | "col" | "stack" | "wrap" | "grid" | "scroll" | "text" | "inline" | "leaf" | "passthrough";

export interface WidgetDef {
  name: string;
  module: CoreModule;
  aliases?: readonly string[];
  doc: string;
  keys: readonly KeyDef[];
  groups?: readonly GroupDef[];
  slots: readonly SlotDef[];
  /** HTML element the web target renders. */
  tag: string;
  layout: LayoutKind;
  /** Event bound by `.fnc(...)`. */
  primaryAction?: string;
  events?: readonly string[];
  example: string;
}

export type CoreModule = "layout" | "content" | "paint" | "effects" | "interact" | "motion" | "scale" | "system";

// ------------------------------------------------------------------ shared keys

const k = (name: string, type: TypeName, doc: string, extra: Partial<KeyDef> = {}): KeyDef => ({ name, type, doc, ...extra });

const SIZING = ["fill", "hug"] as const;

export const SIZE_KEYS: readonly KeyDef[] = [
  k("w", "len", "Width: a length, `fill` (share the remaining space) or `hug` (fit content, default).", { values: SIZING, dimension: true, animatable: true, aliases: ["width"] }),
  k("h", "len", "Height: a length, `fill` or `hug` (default).", { values: SIZING, dimension: true, animatable: true, aliases: ["height"] }),
  k("size", "size", "Width and height together: `size: 200` or `size: (200, 120)`.", { dimension: true, animatable: true, aliases: ["s"] }),
  k("minW", "len", "Minimum width.", { dimension: true, animatable: true, aliases: ["minWidth"] }),
  k("maxW", "len", "Maximum width.", { dimension: true, animatable: true, aliases: ["maxWidth"] }),
  k("minH", "len", "Minimum height.", { dimension: true, animatable: true, aliases: ["minHeight"] }),
  k("maxH", "len", "Maximum height.", { dimension: true, animatable: true, aliases: ["maxHeight"] }),
  k("aspect", "num", "Aspect ratio (width / height), e.g. `16/9`.", { dimension: true, aliases: ["aspectRatio"] }),
];

/** Keys every widget accepts (applied in its parent's layout). */
export const COMMON_KEYS: readonly KeyDef[] = [
  k("margin", "insets", "Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`.", { animatable: true }),
  k("opacity", "num", "Opacity from 0 to 1.", { animatable: true }),
  k("hide", "bool", "Removes the object from layout and the accessibility tree.", { aliases: ["hidden"] }),
  k("shrink", "num", "Shrink priority when space runs out. Lower shrinks first; 0 never shrinks.", { default: "1" }),
  k("flex", "num", "Share of remaining space for `fill` sizes.", { default: "1" }),
  k("cursor", "enum", "Pointer cursor.", { values: ["auto", "pointer", "text", "grab", "grabbing", "move", "notAllowed", "crosshair", "none"] }),
  k("className", "txt", "Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS).", { aliases: ["class"] }),
];

const BORDER_ALIGN = ["in", "mid", "out"] as const;

export const DECOR_KEYS: readonly KeyDef[] = [
  k("color", "paint", "Background paint: a colour or gradient.", { animatable: true, aliases: ["bg", "background", "colorBG"] }),
  k("padding", "insets", "Space inside the object.", { animatable: true, aliases: ["pad"] }),
  k("cornerRadius", "radius", "Corner radius: one length or `only(topLeft: 8, …)`.", { animatable: true, aliases: ["radius", "borderRadius", "corner"] }),
  k("borderWidth", "len", "Border width.", { animatable: true }),
  k("borderColor", "color", "Border colour.", { animatable: true }),
  k("borderAlign", "enum", "Where the border sits relative to the edge: `in`, `mid` or `out`.", { values: BORDER_ALIGN, default: "in" }),
  k("borderStyle", "enum", "Border line style.", { values: ["solid", "dashed", "dotted"], default: "solid" }),
  k("borderSides", "enum", "Which sides draw the border (inside the box).", { values: ["all", "top", "bottom", "left", "right", "x", "y"], default: "all" }),
  k("shadow", "shadow", "Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`.", { animatable: true }),
  k("clip", "bool", "Clip children to the object's bounds (and corner radius)."),
  k("z", "int", "Stacking order among siblings."),
];

export const BORDER_GROUP: GroupDef = {
  name: "border",
  doc: "Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.",
  keys: { align: "borderAlign", color: "borderColor", width: "borderWidth", style: "borderStyle", sides: "borderSides" },
};

const ALIGN_VALUES = ["topLeft", "topMid", "topRight", "midLeft", "mid", "midRight", "bottomLeft", "bottomMid", "bottomRight"] as const;
export const AXIS_VALUES = ["start", "mid", "end", "between", "around", "evenly", "stretch"] as const;
export const OVERFLOW_VALUES = ["auto", "wrap", "stack", "scroll", "clip", "shrink", "warn", "error"] as const;

const OBJ_ALIGN = k("objAlign", "align", "Where the object's content sits inside it.", { default: "topLeft", aliases: ["alignment", "contentAlign"] });
const OVERFLOW = k("overflow", "enum", "What happens when content does not fit. `auto` adapts deterministically (see Layout & Adaptation).", { values: OVERFLOW_VALUES, default: "auto" });

const box = (...extra: KeyDef[]): KeyDef[] => [...SIZE_KEYS, ...DECOR_KEYS, ...COMMON_KEYS, ...extra];

const ONE: SlotDef = { name: "obj", kind: "one", doc: "The single child object.", default: true };
const MANY: SlotDef = { name: "objs", kind: "many", doc: "Child objects, in order.", default: true };
const TEXT: SlotDef = { name: "obj", kind: "text", doc: "The text.", default: true, required: true };

const FLEX_KEYS = (dir: "row" | "col"): KeyDef[] => [
  k("xAlign", "axis", dir === "row" ? "Horizontal distribution along the row." : "Horizontal alignment of children.", { default: "start", aliases: dir === "row" ? ["mainAxisAlignment"] : ["crossAxisAlignment"] }),
  k("yAlign", "axis", dir === "row" ? "Vertical alignment of children." : "Vertical distribution down the column.", { default: "start", aliases: dir === "row" ? ["crossAxisAlignment"] : ["mainAxisAlignment"] }),
  k("gap", "len", "Space between children.", { animatable: true, aliases: ["spacing"] }),
  OVERFLOW,
  k("stackAt", "len", "Row only: the width below which the row stacks into a column (computed automatically when omitted)."),
  k("reverse", "bool", "Reverse the visual order."),
];

const TEXT_KEYS: readonly KeyDef[] = [
  k("size", "len", "Font size in design px.", { animatable: true, aliases: ["fontSize"] }),
  k("font", "txt", "Font family, e.g. `'Geist'`.", { aliases: ["fontFamily"] }),
  k("weight", "enum", "Font weight: `thin`…`black` or 100–900.", { values: ["thin", "light", "regular", "medium", "semibold", "bold", "black"], aliases: ["fontWeight", "wight"] }),
  k("italic", "bool", "Italic style.", { aliases: ["italics"] }),
  k("color", "paint", "Text colour (a gradient paints the glyphs).", { animatable: true }),
  k("align", "enum", "Text alignment.", { values: ["left", "mid", "right", "start", "end", "justify"], aliases: ["textAlign", "textAlight"] }),
  k("lineHeight", "num", "Line height as a multiple of the font size.", { animatable: true }),
  k("letterSpacing", "len", "Space between letters.", { animatable: true }),
  k("type", "enum", "Semantic type (sets the element and default style): h1–h6, p, label, code, span.", { values: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "label", "code", "span", "strong", "em"], default: "p" }),
  k("underline", "bool", "Underline."),
  k("underlinePos", "enum", "Underline position.", { values: ["auto", "under", "baseline"] }),
  k("underlineSkipInk", "bool", "Skip descenders when underlining.", { default: "true" }),
  k("strike", "bool", "Strike-through."),
  k("transform", "enum", "Case transform.", { values: ["none", "upper", "lower", "capitalize"] }),
  k("overflow", "enum", "Long text: wrap (default), ellipsis, fade, scale or clip.", { values: ["wrap", "ellipsis", "fade", "scale", "clip"], default: "wrap" }),
  k("maxLines", "int", "Maximum lines before `overflow` applies."),
  k("selectable", "bool", "Allow selection.", { default: "true" }),
  k("baseline", "enum", "Vertical alignment inside a line.", { values: ["top", "mid", "bottom", "baseline"], aliases: ["textBaseline"] }),
];

const EVENTS = ["tap", "press", "hover", "hoverEnd", "focus", "blur", "key", "drag", "swipe", "mount", "unmount", "visible"] as const;

// ------------------------------------------------------------------ widgets

export const WIDGETS: readonly WidgetDef[] = [
  // layout
  {
    name: "Container",
    module: "layout",
    aliases: ["Box"],
    doc: "A box: size, paint, border, corners, shadow and padding around one object.",
    keys: box(OBJ_ALIGN, OVERFLOW),
    groups: [BORDER_GROUP],
    slots: [ONE],
    tag: "div",
    layout: "box",
    events: EVENTS,
    example: "Container(\n  .config(\n    w: 200\n    h: 120\n    color: #1c1917\n    cornerRadius: 16\n    objAlign: mid\n  )\n  .obj(Text(.config(color: white) .obj('Hello')))\n)",
  },
  {
    name: "Row",
    module: "layout",
    doc: "Lays objects out left to right. Adapts deterministically when space runs out.",
    keys: box(...FLEX_KEYS("row")),
    groups: [BORDER_GROUP],
    slots: [MANY],
    tag: "div",
    layout: "row",
    events: EVENTS,
    example: "Row(.config(gap: 8, yAlign: mid), Text('★'), Text('Starred'))",
  },
  {
    name: "Column",
    module: "layout",
    aliases: ["Col"],
    doc: "Lays objects out top to bottom.",
    keys: box(...FLEX_KEYS("col")),
    groups: [BORDER_GROUP],
    slots: [MANY],
    tag: "div",
    layout: "col",
    events: EVENTS,
    example: "Column(.config(gap: 8), Text('Title'), Text('Body'))",
  },
  {
    name: "Stack",
    module: "layout",
    doc: "Layers objects on top of each other; later objects paint above earlier ones (or use `Order`).",
    keys: box(OBJ_ALIGN),
    groups: [BORDER_GROUP],
    slots: [MANY],
    tag: "div",
    layout: "stack",
    events: EVENTS,
    example: "Stack(\n  Container(.config(size: 200, cornerRadius: 16, color: #1c1917))\n  Position(.config(x: 16, y: 16) .obj(Text(.config(color: white) .obj('Badge'))))\n)",
  },
  {
    name: "Position",
    module: "layout",
    aliases: ["Positioned"],
    doc: "Offsets an object inside a Stack by x/y, pins it to edges, or keeps it in view with `sticky: true`. Negative values are allowed.",
    keys: [
      k("x", "len", "Horizontal offset from where the object would sit.", { animatable: true }),
      k("sticky", "bool", "Stays in view while its scroll container scrolls, held at the given edges (top: 0 by default)."),
      k("y", "len", "Vertical offset.", { animatable: true }),
      k("top", "len", "Distance from the Stack's top edge.", { animatable: true }),
      k("right", "len", "Distance from the right edge.", { animatable: true }),
      k("bottom", "len", "Distance from the bottom edge.", { animatable: true }),
      k("left", "len", "Distance from the left edge.", { animatable: true }),
      ...SIZE_KEYS,
      ...COMMON_KEYS,
    ],
    slots: [ONE],
    tag: "div",
    layout: "passthrough",
    example: "Position(.config(bottom: -10, right: 0) .obj(Dot()))",
  },
  {
    name: "Order",
    module: "layout",
    doc: "Sets an object's layer in a Stack, Mask or Subtract. 0 is the base; negatives go below.",
    keys: [k("pos", "int", "Layer position.", { modifier: true, default: "0" }), ...COMMON_KEYS],
    slots: [ONE],
    tag: "div",
    layout: "passthrough",
    example: "Order(.pos(1) .obj(Container(.config(size: 100, color: red))))",
  },
  {
    name: "Mid",
    module: "layout",
    aliases: ["Center", "Centre", "Cen"],
    doc: "Fills its parent and centres its object.",
    keys: [...COMMON_KEYS],
    slots: [ONE],
    tag: "div",
    layout: "box",
    example: "Mid(Text('Centred'))",
  },
  {
    name: "Align",
    module: "layout",
    doc: "Fills its parent and places its object at an alignment.",
    keys: [k("to", "align", "Where to place the object.", { default: "mid", aliases: ["align", "alignment"] }), ...COMMON_KEYS],
    slots: [ONE],
    tag: "div",
    layout: "box",
    example: "Align(.config(to: bottomRight) .obj(Button(.config(label: 'Next'))))",
  },
  {
    name: "Expand",
    module: "layout",
    aliases: ["Expanded", "Flexible"],
    doc: "Makes its object fill the remaining space along the parent's direction.",
    keys: [k("flex", "num", "Share of the remaining space.", { default: "1" }), ...COMMON_KEYS.filter((x) => x.name !== "flex")],
    slots: [ONE],
    tag: "div",
    layout: "passthrough",
    example: "Row(Text('Name'), Expand(Input(.config(label: 'Name'))))",
  },
  {
    name: "Gap",
    module: "layout",
    aliases: ["Space", "SizedBox", "Spacer"],
    doc: "Fixed empty space along the parent's direction: `Gap(20)`.",
    keys: [k("size", "len", "The space.", { default: "0" })],
    slots: [{ name: "size", kind: "text", doc: "The space (positional).", default: true }],
    tag: "div",
    layout: "leaf",
    example: "Column(Text('A'), Gap(24), Text('B'))",
  },
  {
    name: "Wrap",
    module: "layout",
    doc: "Lays objects out in rows that wrap onto new lines.",
    keys: box(k("gap", "len", "Space between objects on a line.", { animatable: true }), k("runGap", "len", "Space between lines.", { animatable: true }), ...FLEX_KEYS("row").filter((x) => x.name === "xAlign" || x.name === "yAlign")),
    groups: [BORDER_GROUP],
    slots: [MANY],
    tag: "div",
    layout: "wrap",
    events: EVENTS,
    example: "Wrap(.config(gap: 8), Chip('a'), Chip('b'), Chip('c'))",
  },
  {
    name: "Grid",
    module: "layout",
    doc: "A grid with a fixed column count or columns that fit a minimum item width.",
    keys: box(
      k("cols", "int", "Number of columns."),
      k("minItemW", "len", "Minimum item width; columns fit automatically (ignored when `cols` is set)."),
      k("gap", "len", "Space between items.", { animatable: true }),
      k("rowGap", "len", "Space between rows (defaults to `gap`).", { animatable: true }),
    ),
    groups: [BORDER_GROUP],
    slots: [MANY],
    tag: "div",
    layout: "grid",
    events: EVENTS,
    example: "Grid(.config(minItemW: 240, gap: 16), Card(), Card(), Card())",
  },
  {
    name: "Scroll",
    module: "layout",
    aliases: ["ScrollView", "SingleChildScrollView"],
    doc: "Scrolls its object along an axis.",
    keys: box(
      k("axis", "enum", "Scroll direction.", { values: ["y", "x", "both"], default: "y" }),
      k("bar", "enum", "Scrollbar visibility.", { values: ["auto", "show", "hide"], default: "auto" }),
      k("snap", "enum", "Scroll snapping.", { values: ["none", "start", "mid", "end"], default: "none" }),
      k("fade", "len", "Fades content out over this distance at the edges that can still scroll, so nothing ends in a hard cut."),
    ),
    groups: [BORDER_GROUP],
    slots: [ONE],
    tag: "div",
    layout: "scroll",
    events: EVENTS,
    example: "Scroll(.config(axis: x), Row(Card(), Card(), Card()))",
  },
  {
    name: "Aspect",
    module: "layout",
    aliases: ["AspectRatio"],
    doc: "Keeps its object at an aspect ratio.",
    keys: [k("ratio", "num", "Width / height.", { default: "1" }), ...SIZE_KEYS.filter((x) => x.name !== "aspect"), ...COMMON_KEYS],
    slots: [ONE],
    tag: "div",
    layout: "box",
    example: "Aspect(.config(ratio: 16/9) .obj(Image(.config(src: 'hero.jpg', alt: 'Hero'))))",
  },
  {
    name: "SafeArea",
    module: "layout",
    doc: "Pads its object away from device notches and system bars.",
    keys: [k("edges", "enum", "Which edges to protect.", { values: ["all", "top", "bottom", "x", "y"], default: "all" }), ...COMMON_KEYS],
    slots: [ONE],
    tag: "div",
    layout: "box",
    example: "SafeArea(Column(...))",
  },
  {
    name: "Adapt",
    module: "layout",
    aliases: ["ViewThatFits"],
    doc: "Shows the first candidate layout that fits the available space.",
    keys: [...SIZE_KEYS, ...COMMON_KEYS],
    slots: [{ name: "objs", kind: "many", doc: "Candidates, most preferred first.", default: true, required: true }],
    tag: "div",
    layout: "box",
    example: "Adapt(Row(Logo(), Nav()), Column(Logo(), Nav()))",
  },
  {
    name: "Scaffold",
    module: "layout",
    aliases: ["Frame"],
    doc: "The page's viewport box: full height, safe areas, scroll policy and the overflow boundary.",
    keys: [
      k("color", "paint", "Page background.", { aliases: ["colorBG", "bg", "background"] }),
      k("textColor", "color", "The page's text colour: every Text without its own `color` uses it. Without it, text follows the colour scheme (dark text on light, light on dark).", { aliases: ["fg", "foreground"] }),
      k("scroll", "enum", "`y` scrolls the page (default); `none` makes a fixed, app-like screen.", { values: ["y", "none"], default: "y" }),
      k("fit", "enum", "Design Scale fit: `width` (default for scrolling), `contain` (default for fixed screens), `cover` or `canvas`.", { values: ["width", "contain", "cover", "canvas"] }),
      k("padding", "insets", "Space inside the page."),
      ...COMMON_KEYS,
    ],
    slots: [
      { name: "bar", kind: "one", doc: "Top bar (sticky)." },
      { name: "body", kind: "one", doc: "Page content.", default: true },
      { name: "footer", kind: "one", doc: "Bottom area." },
    ],
    tag: "div",
    layout: "col",
    example: "Scaffold(\n  .config(color: white.shade(1))\n  .body(Mid(Text('Hello')))\n)",
  },

  // content
  {
    name: "Text",
    module: "content",
    aliases: ["Txt"],
    doc: "Text. `type` gives it meaning (h1–h6, p, label, code) for accessibility and SEO.",
    keys: [...TEXT_KEYS, ...SIZE_KEYS.filter((x) => x.name !== "size"), ...COMMON_KEYS],
    slots: [TEXT],
    tag: "p",
    layout: "text",
    events: EVENTS,
    example: "Text(.config(type: h1, size: 48, weight: bold) 'Hello')",
  },
  {
    name: "Span",
    module: "content",
    aliases: ["RichText"],
    doc: "Inline text runs inside Text: `Text(Span(.config(weight: bold) 'Bold'), ' and plain')`.",
    keys: [...TEXT_KEYS.filter((x) => x.name !== "type" && x.name !== "maxLines"), ...COMMON_KEYS],
    slots: [{ name: "objs", kind: "many", doc: "Text and nested spans.", default: true }],
    tag: "span",
    layout: "inline",
    events: EVENTS,
    example: "Text('Read the ', Span(.config(underline: true) 'docs'))",
  },
  {
    name: "Image",
    module: "content",
    aliases: ["Img"],
    doc: "An image. Give `alt` (or `decorative: true`). Per-frame sources: `src: (m: 'a.jpg', w: 'a@2x.jpg')`.",
    keys: [
      k("src", "src", "Image URL, or one per frame."),
      k("alt", "txt", "Text alternative for screen readers."),
      k("decorative", "bool", "Purely decorative: hidden from assistive technology."),
      k("fit", "enum", "How the image fills its box.", { values: ["cover", "contain", "fill", "none", "scaleDown"], default: "cover" }),
      k("position", "align", "Focal point when cropped.", { default: "mid" }),
      k("lazy", "bool", "Load when near the viewport.", { default: "true" }),
      ...SIZE_KEYS,
      k("cornerRadius", "radius", "Corner radius.", { animatable: true, aliases: ["radius"] }),
      ...COMMON_KEYS,
    ],
    slots: [],
    tag: "img",
    layout: "leaf",
    events: EVENTS,
    example: "Image(.config(src: 'hero.jpg', alt: 'A mountain lake', w: fill, aspect: 16/9))",
  },
  {
    name: "Svg",
    module: "content",
    doc: "An SVG from a URL; `color` sets currentColor.",
    keys: [k("src", "src", "SVG URL."), k("alt", "txt", "Text alternative."), k("color", "color", "currentColor.", { animatable: true }), ...SIZE_KEYS, ...COMMON_KEYS],
    slots: [],
    tag: "img",
    layout: "leaf",
    example: "Svg(.config(src: 'logo.svg', alt: 'LAYR', h: 24))",
  },
  {
    name: "Icon",
    module: "content",
    doc: "An icon by name from the registered icon set (e.g. the `icons` addon).",
    keys: [k("name", "txt", "Icon name."), k("size", "len", "Icon size.", { default: "24", animatable: true }), k("color", "color", "Icon colour.", { animatable: true }), k("label", "txt", "Accessible label; omit for decorative icons."), ...COMMON_KEYS],
    slots: [{ name: "name", kind: "text", doc: "Icon name (positional).", default: true }],
    tag: "span",
    layout: "leaf",
    example: "Icon('arrow-right')",
  },
  {
    name: "Video",
    module: "content",
    doc: "A video with native controls and captions.",
    keys: [
      k("src", "src", "Video URL."),
      k("poster", "src", "Poster image."),
      k("captions", "src", "WebVTT captions URL."),
      k("autoplay", "bool", "Autoplay (implies muted)."),
      k("loop", "bool", "Loop."),
      k("muted", "bool", "Muted."),
      k("controls", "bool", "Show controls.", { default: "true" }),
      k("fit", "enum", "How the video fills its box.", { values: ["cover", "contain", "fill"], default: "contain" }),
      ...SIZE_KEYS,
      k("cornerRadius", "radius", "Corner radius."),
      ...COMMON_KEYS,
    ],
    slots: [],
    tag: "video",
    layout: "leaf",
    events: EVENTS,
    example: "Video(.config(src: 'intro.mp4', captions: 'intro.vtt', w: fill, aspect: 16/9))",
  },

  // effects
  {
    name: "Blur",
    module: "effects",
    doc: "Blurs what is behind the object (`blurOn: background`, frosted glass) or the object's own content (`blurOn: object`), uniformly or progressively: a progressive blur rises smoothly toward one `edge`, the way content dissolves under a header or at the end of a list.",
    keys: [
      k("blurOn", "enum", "What to blur: what shows through from behind (`background`), or the content inside (`object`).", { values: ["background", "object"], default: "background" }),
      k("type", "enum", "Uniform, or progressive (clear at one side, strongest at `edge`).", { values: ["uniform", "progressive"], default: "uniform" }),
      k("value", "len", "Blur radius; for a progressive blur, the radius at `edge`.", { default: "12", animatable: true }),
      k("edge", "enum", "Progressive: the side where the blur is strongest.", { values: ["bottom", "top", "left", "right"], default: "bottom" }),
      k("extent", "any", "Progressive: how far from `edge` the blur reaches, as a length or a percentage of the object.", { default: "100%" }),
      k("layers", "num", "Progressive: blur layers. More is smoother and costs more to paint.", { default: "8" }),
      k("curve", "enum", "Progressive: how the blur grows toward `edge`. `exponential` stays clear longest and feels most natural.", { values: ["linear", "ease", "exponential"], default: "exponential" }),
      k("fade", "color", "Progressive: a colour the blurred edge fades into, e.g. the page background, so text over it stays readable."),
      k("values", "any", "Progressive: blur radii at the clear side and at `edge`, e.g. `(0, 25)` (instead of `value`)."),
      k("direction", "any", "Progressive: from/to alignment, e.g. `(t, b)` (the older form of `edge`)."),
      ...box(),
    ],
    groups: [BORDER_GROUP],
    slots: [ONE],
    tag: "div",
    layout: "box",
    example: "Stack(.config(w: fill, h: 220, cornerRadius: 16, clip: true), Container(.config(w: fill, h: fill, color: LinearGradient(.colors(#ff6a3d, #9b8cff, #2ed3c4)))), Row(.config(w: fill, h: fill, gap: 16, padding: all(24), yAlign: mid), Container(.config(size: 64, cornerRadius: 32, color: #ffc46b)), Container(.config(size: 96, cornerRadius: 20, color: #1c1917))), Position(.config(left: 40, right: 40, top: 50, bottom: 50) .obj(Blur(.config(w: fill, h: fill, value: 18, cornerRadius: 14, color: #fffcf7.alpha(35%)) .obj(Mid(Text(.config(size: 18, weight: semibold, color: #1c1917) .obj('Frosted glass'))))))))",
  },
  {
    name: "Mask",
    module: "effects",
    doc: "Masks layers with the lowest `Order` layer (a paint: colour, gradient or image).",
    keys: [k("mode", "enum", "Mask by alpha or luminance.", { values: ["alpha", "luminance"], default: "alpha" }), ...SIZE_KEYS, ...COMMON_KEYS],
    slots: [MANY],
    tag: "div",
    layout: "stack",
    example: "Mask(\n  Order(.pos(0) .obj(Container(.config(size: 200, color: LinearGradient(.colors(black.alpha(0), black))))))\n  Order(.pos(1) .obj(Container(.config(size: 200, color: red))))\n)",
  },
  {
    name: "Subtract",
    module: "effects",
    doc: "Cuts the upper layer's shape out of the base layer.",
    keys: [k("align", "align", "Where the cut sits by default.", { default: "mid" }), ...SIZE_KEYS, ...COMMON_KEYS],
    slots: [MANY],
    tag: "div",
    layout: "stack",
    example: "Subtract(\n  Order(.pos(0) .obj(Container(.config(size: 200, color: black))))\n  Order(.pos(1) .obj(Position(.config(bottom: -10) .obj(Container(.config(size: 100, cornerRadius: 50))))))\n)",
  },
  {
    name: "Clip",
    module: "effects",
    doc: "Clips its object to a shape.",
    keys: [k("shape", "enum", "Clip shape.", { values: ["rect", "circle", "ellipse"], default: "rect" }), k("cornerRadius", "radius", "Corner radius for `rect`."), ...SIZE_KEYS, ...COMMON_KEYS],
    slots: [ONE],
    tag: "div",
    layout: "box",
    example: "Clip(.config(shape: circle) .obj(Image(.config(src: 'me.jpg', alt: 'Portrait', size: 64))))",
  },
  {
    name: "Filter",
    module: "effects",
    doc: "Colour filters and blend modes for its object.",
    keys: [
      k("grayscale", "num", "0–1.", { animatable: true }),
      k("blur", "len", "Blur radius.", { animatable: true }),
      k("brightness", "num", "1 is unchanged.", { animatable: true }),
      k("contrast", "num", "1 is unchanged.", { animatable: true }),
      k("saturate", "num", "1 is unchanged.", { animatable: true }),
      k("hueRotate", "angle", "Hue rotation.", { animatable: true }),
      k("invert", "num", "0–1.", { animatable: true }),
      k("sepia", "num", "0–1.", { animatable: true }),
      k("blend", "enum", "Blend mode with what is behind.", { values: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference", "exclusion", "color", "luminosity"] }),
      ...COMMON_KEYS,
    ],
    slots: [ONE],
    tag: "div",
    layout: "passthrough",
    example: "Filter(.config(grayscale: 1) .obj(Image(.config(src: 'a.jpg', alt: 'A'))))",
  },

  // interact (headless, accessible)
  {
    name: "Button",
    module: "interact",
    doc: "An accessible button. `.fnc(...)` runs on activation (click, Enter, Space). Unstyled except `.preset(default)`.",
    keys: box(k("label", "txt", "Button text (and accessible name)."), k("disabled", "bool", "Disabled."), k("submit", "bool", "Submits its Form."), OBJ_ALIGN),
    groups: [BORDER_GROUP],
    slots: [ONE],
    tag: "button",
    layout: "box",
    primaryAction: "press",
    events: EVENTS,
    example: "Button(.preset(default) .config(label: 'Save') .fnc(save()))",
  },
  {
    name: "Link",
    module: "interact",
    doc: "Navigates to a page or URL.",
    keys: box(k("to", "page", "Page to open, e.g. `DemoPage`."), k("href", "txt", "External URL."), k("label", "txt", "Link text (when there is no object)."), k("external", "bool", "Open in a new tab."), k("underline", "bool", "Underline the link (browsers underline links by default)."), OBJ_ALIGN),
    groups: [BORDER_GROUP],
    slots: [ONE],
    tag: "a",
    layout: "box",
    primaryAction: "press",
    events: EVENTS,
    example: "Link(.config(to: DocsPage) .obj(Text('Docs')))",
  },
  {
    name: "Input",
    module: "interact",
    aliases: ["TextField"],
    doc: "A labelled text input. `.fnc` runs on change with the new value.",
    keys: box(
      k("value", "txt", "Current value (bind a var to make it two-way)."),
      k("label", "txt", "Label (required for accessibility)."),
      k("placeholder", "txt", "Placeholder."),
      k("kind", "enum", "Input kind.", { values: ["text", "email", "password", "number", "search", "tel", "url"], default: "text" }),
      k("multiline", "bool", "A multi-line text area."),
      k("rows", "int", "Visible rows for multiline."),
      k("disabled", "bool", "Disabled."),
      k("required", "bool", "Required."),
    ),
    groups: [BORDER_GROUP],
    slots: [],
    tag: "input",
    layout: "leaf",
    primaryAction: "change",
    events: [...EVENTS, "submit"],
    example: "Input(.config(label: 'Email', kind: email, value: email) .fnc { email = value })",
  },
  {
    name: "Toggle",
    module: "interact",
    aliases: ["Checkbox", "Switch"],
    doc: "A checkbox or switch.",
    keys: [k("value", "bool", "On or off."), k("label", "txt", "Label."), k("kind", "enum", "Presentation.", { values: ["checkbox", "switch"], default: "checkbox" }), k("disabled", "bool", "Disabled."), ...COMMON_KEYS],
    slots: [],
    tag: "input",
    layout: "leaf",
    primaryAction: "change",
    events: EVENTS,
    example: "Toggle(.config(label: 'Dark mode', kind: switch, value: dark) .fnc { dark = value })",
  },
  {
    name: "Select",
    module: "interact",
    doc: "A labelled choice from options.",
    keys: [k("value", "txt", "Selected value."), k("options", "any", "List of options or `(value, label)` tuples."), k("label", "txt", "Label."), k("disabled", "bool", "Disabled."), ...SIZE_KEYS, ...COMMON_KEYS],
    slots: [],
    tag: "select",
    layout: "leaf",
    primaryAction: "change",
    events: EVENTS,
    example: "Select(.config(label: 'Size', options: ['S', 'M', 'L'], value: size) .fnc { size = value })",
  },
  {
    name: "Slider",
    module: "interact",
    doc: "A labelled range slider.",
    keys: [k("value", "num", "Current value."), k("min", "num", "Minimum.", { default: "0" }), k("max", "num", "Maximum.", { default: "100" }), k("step", "num", "Step.", { default: "1" }), k("label", "txt", "Label."), k("disabled", "bool", "Disabled."), ...SIZE_KEYS, ...COMMON_KEYS],
    slots: [],
    tag: "input",
    layout: "leaf",
    primaryAction: "change",
    events: EVENTS,
    example: "Slider(.config(label: 'Volume', value: vol) .fnc { vol = value })",
  },
  {
    name: "Form",
    module: "interact",
    doc: "Groups inputs; `.fnc` runs on submit.",
    keys: box(k("gap", "len", "Space between fields.")),
    slots: [MANY],
    tag: "form",
    layout: "col",
    primaryAction: "submit",
    events: EVENTS,
    example: "Form(.fnc(send()), Input(.config(label: 'Name')), Button(.config(label: 'Send', submit: true)))",
  },
  {
    name: "Overlay",
    module: "interact",
    aliases: ["Dialog", "Popover", "Modal"],
    doc: "Content above the page (dialogs, popovers, sheets) with focus management. Unstyled.",
    keys: box(
      k("open", "bool", "Whether it is shown."),
      k("modal", "bool", "Blocks the page and traps focus.", { default: "true" }),
      k("dismissible", "bool", "Escape and backdrop click close it.", { default: "true" }),
      k("label", "txt", "Accessible name."),
      k("placement", "align", "Where it appears.", { default: "mid" }),
      k("backdrop", "paint", "Backdrop paint for modal overlays."),
    ),
    groups: [BORDER_GROUP],
    slots: [ONE],
    tag: "dialog",
    layout: "box",
    events: [...EVENTS, "close"],
    example: "Overlay(.config(open: showHelp, label: 'Help') .on(close: { showHelp = false }) .obj(HelpCard()))",
  },
  {
    name: "Focus",
    module: "interact",
    doc: "Focus behaviour for its object: autofocus, focus ring, trap.",
    keys: [k("auto", "bool", "Focus on mount."), k("ring", "bool", "Show the focus ring.", { default: "true" }), k("trap", "bool", "Keep focus inside."), ...COMMON_KEYS],
    slots: [ONE],
    tag: "div",
    layout: "passthrough",
    example: "Focus(.config(auto: true) .obj(Input(.config(label: 'Search'))))",
  },

  // motion
  {
    name: "Animate",
    module: "motion",
    aliases: ["Anim"],
    doc: "Interpolates every change to its object. `.eases(w: spring.gentle)` per property; `.enter(...)`/`.exit(...)` for mount and unmount.",
    keys: [
      k("duration", "time", "Duration for eased (non-spring) transitions.", { default: "300ms" }),
      k("ease", "motion", "Default motion for all properties: an ease or a spring.", { default: "spring.gentle" }),
      k("delay", "time", "Delay before transitions start."),
      k("motion", "enum", "Respect reduced-motion preferences (default) or always animate.", { values: ["respect", "always"], default: "respect" }),
      k("resize", "enum", "Continuous window resizes follow instantly (default) or animate.", { values: ["follow", "animate"], default: "follow" }),
      ...COMMON_KEYS,
    ],
    slots: [ONE],
    tag: "div",
    layout: "passthrough",
    example: "Animate(\n  .eases(w: spring.gentle, h: spring.bounce)\n  .obj(Container(.id(box) .config(w: boxW, h: 100, color: red)))\n)",
  },
];

export const WIDGET_BY_NAME: ReadonlyMap<string, WidgetDef> = new Map(WIDGETS.map((w) => [w.name, w]));

export const WIDGET_ALIASES: ReadonlyMap<string, string> = new Map(WIDGETS.flatMap((w) => (w.aliases ?? []).map((a) => [a, w.name] as const)));

/** Resolves a widget name or alias to its definition. */
export function widget(name: string): WidgetDef | undefined {
  return WIDGET_BY_NAME.get(name) ?? WIDGET_BY_NAME.get(WIDGET_ALIASES.get(name) ?? "");
}

export function keyOf(w: WidgetDef, name: string): KeyDef | undefined {
  return w.keys.find((x) => x.name === name) ?? w.keys.find((x) => x.aliases?.includes(name));
}

// ------------------------------------------------------------------ language constructs

export interface ConstructDef {
  name: string;
  doc: string;
  modifiers: readonly string[];
  example: string;
}

export const CONSTRUCTS: readonly ConstructDef[] = [
  { name: "App", doc: "The application root: Design Scale, theme, providers and global state.", modifiers: ["scale", "theme", "providers", "meta", "react"], example: "App(.scale(DesignScale(.m(w: 390, h: 844) .w(w: 1440, h: 900))))" },
  { name: "Page", doc: "A routable page: route, metadata, data loading, state and one Scaffold.", modifiers: ["name", "route", "meta", "load", "paths", "state", "scale", "react", "on"], example: "Page(.name(Home) .route('/') Scaffold(.body(Mid(Text('Hello')))))" },
  { name: "Widget", doc: "A reusable widget. Params become config keys; `.obj(.obj)` forwards the caller's object.", modifiers: ["name", "param", "react", "obj"], example: "Widget(.name(Card) .param(req txt title) .obj(Container(.config(padding: all(16)) .obj(Text(param.title)))))" },
  { name: "Function", doc: "A named, typed action. Body as SAPI steps `.def(...)` or TypeScript `.def { }`.", modifiers: ["name", "param", "def"], example: "Function(.name(inc) .param(ref int n) .def { n++ })" },
  { name: "Preset", doc: "A named config bundle for a widget type.", modifiers: ["name", "for", "config"], example: "Preset(.name(primary) .for(Button) .config(color: blue, padding: sym(x: 16, y: 10)))" },
  { name: "DesignScale", doc: "Design frames and scale limits for the app, a page or a subtree.", modifiers: ["m", "t", "w", "uw", "frame", "config", "obj"], example: "DesignScale(.m(w: 390, h: 844) .w(w: 1440, h: 900))" },
  { name: "Theme", doc: "Named colours and fonts exposed as tokens (CSS variables `--layr-color-<name>`, `--layr-font-<name>`). `.dark(...)` overrides colours when the system is in dark mode; `font: <name>` on Text uses a theme font.", modifiers: ["colors", "dark", "font"], example: "Theme(.colors(ink: #0d0d0d, paper: #fdfdfd) .dark(ink: #fdfdfd, paper: #0d0d0d) .font(body: 'Geist'))" },
  { name: "Extract", doc: "Reads features of any object, optionally at a point in its injection cascade.", modifiers: ["from", "lookUp", "exeOrder"], example: "Extract(.from(SomePage.card) insets pad = card.padding)" },
  { name: "Inject", doc: "Changes a feature of any object from anywhere as a reversible layer ordered by `.exeOrder`.", modifiers: ["into", "lookUp", "exeOrder", "force"], example: "Inject(.into(SomePage.card) .exeOrder(0) card.padding = pad * 2)" },
  { name: "Export", doc: "Names and groups features of an object under an export id (optional; everything is reachable by path or id).", modifiers: ["from", "lookUp"], example: "Export(.from(SomePage.card) size cardSize = card.size)" },
];

/** Modifiers every widget accepts. */
export const COMMON_MODIFIERS: readonly string[] = ["id", "preset", "config", "at", "export", "fnc", "on", "a11y", "react", "props", "slot", "obj", "objs"];

/** Modifier aliases → canonical. */
export const MODIFIER_ALIASES: Readonly<Record<string, string>> = {
  exc: "exe",
  lookUp: "from",
  body: "body",
  children: "objs",
  child: "obj",
  child_: "obj",
};

/** Canonical modifier order inside a node. Unlisted modifiers keep their relative position after `.on`. */
export const MODIFIER_ORDER: readonly string[] = ["name", "id", "route", "meta", "preset", "for", "param", "config", "at", "export", "eases", "enter", "exit", "react", "load", "paths", "state", "fnc", "on", "a11y", "props"];

// ------------------------------------------------------------------ type vocabulary

export const TYPE_ALIASES: Readonly<Record<string, string>> = {
  double: "num",
  float: "num",
  number: "num",
  string: "txt",
  text: "txt",
  object: "obj",
  widget: "obj",
  padding: "insets",
  margin: "insets",
  boolean: "bool",
  length: "len",
  duration: "time",
};

export const TYPE_NAMES: readonly string[] = ["int", "num", "txt", "bool", "color", "paint", "len", "size", "insets", "align", "axis", "time", "angle", "shadow", "border", "obj", "fn", "list", "map", "any"];

export const ALIGN_ALL: readonly string[] = ALIGN_VALUES;
