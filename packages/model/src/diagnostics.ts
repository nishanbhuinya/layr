/**
 * The diagnostics catalogue. Every code the compiler, analyzer or runtime can report, with the
 * explanation shown by `layr explain`, the `/errors` pages and the LAYR Skill.
 */
import type { Severity } from "./types.ts";

export interface DiagnosticDef {
  code: string;
  severity: Severity;
  title: string;
  explain: string;
  example?: { bad: string; good: string };
}

const d = (code: string, severity: Severity, title: string, explain: string, example?: DiagnosticDef["example"]): DiagnosticDef => ({ code, severity, title, explain, example });

export const DIAGNOSTICS: readonly DiagnosticDef[] = [
  // L0 syntax
  d("L0001", "error", "Unexpected character", "The file contains a character that cannot start any LAYR token."),
  d("L0002", "error", "Unterminated string", "A string was opened with `'` or `\"` but not closed on the same line."),
  d("L0003", "error", "Unterminated comment", "A `/*` comment has no closing `*/`."),
  d("L0004", "error", "Unterminated block", "A `{` TypeScript block has no matching `}`."),
  d("L0005", "error", "Unmatched brace", "A `}` appears without an opening `{`."),
  d("L0010", "error", "Expected token", "The parser expected a specific token here, usually a closing `)`."),
  d("L0011", "error", "Unexpected token", "This token cannot start an item. Items are modifiers (`.config(...)`), props (`key: value`), declarations or values."),
  d(
    "L0012",
    "error",
    "Missing separator",
    "Two items on one line must be separated by a comma. Items on separate lines need nothing.",
    { bad: "Column(Text('a') Text('b'))", good: "Column(Text('a'), Text('b'))" },
  ),
  d("L0013", "error", "Invalid import", "Imports follow TypeScript syntax: `import { a } from 'pkg'`, `import X from './x.layr'`."),
  d("L0014", "error", "Expected a value", "A value (number, string, colour, name or call) was expected here."),

  // L1 names, types, schema
  d("L1001", "error", "Unknown widget", "No core widget, project widget or addon widget has this name. Check the spelling or import it."),
  d("L1002", "error", "Unknown config key", "This widget has no such config key. The message lists the closest keys.", { bad: "Container(.config(widht: 200))", good: "Container(.config(w: 200))" }),
  d("L1003", "error", "Wrong value type", "The value does not match the key's type (for example a colour where a length is expected)."),
  d("L1004", "error", "Unknown value", "This identifier is not one of the values the key accepts."),
  d("L1005", "error", "Unknown name", "The name is not a declared var/const/bind, param, Function, import or object id in scope."),
  d("L1006", "error", "Unknown modifier", "This modifier does not exist on this widget or construct."),
  d("L1007", "error", "Wrong slot", "The object was given to a slot that does not accept it (for example several objects in a single `.obj`)."),
  d("L1008", "error", "Missing required value", "A required param or slot was not provided."),
  d("L1009", "error", "Duplicate id", "Two objects in the same Page or Widget share an `.id`. Ids must be unique per definition."),
  d("L1010", "error", "Duplicate declaration", "The name is already declared in this scope."),
  d("L1011", "info", "Non-canonical spelling", "An alias or non-canonical form was used. `layr format` rewrites it to the canonical form."),
  d("L1012", "error", "Duplicate config key", "The same key is set twice in one `.config`."),
  d("L1013", "error", "Invalid Page", "A Page needs `.name(...)` and exactly one root object (usually a Scaffold)."),
  d("L1014", "error", "Invalid Widget", "A Widget needs `.name(...)` and one `.obj(...)` root."),
  d("L1015", "error", "Unknown frame", "`.at(frame, ...)` names a frame that the active DesignScale does not define."),
  d("L1016", "warning", "Unused declaration", "The declaration is never read."),

  // L2 layout
  d(
    "L2001",
    "error",
    "fill on an unbounded axis",
    "`fill` shares remaining space, but a scrolling axis has no end, so there is nothing to share. Give the object a length or `hug`, or bound the scroll area.",
    { bad: "Scroll(Column(Container(.config(h: fill))))", good: "Scroll(Column(Container(.config(h: 400))))" },
  ),
  d("L2003", "warning", "Invisible box", "A `hug` Container with no child is 0×0, so its paint is never visible. Give it a size."),
  d("L2101", "warning", "Overflow cannot adapt", "The content cannot fit and no adaptation applies (for example a fixed child larger than its fixed parent on both axes). It is clipped. Make a size flexible or set `overflow` explicitly."),
  d("L2102", "info", "Layout adapted", "At some frame this Row wraps or stacks. The message says where. Set `overflow` to make the choice explicit."),

  // L3 Export / Extract / Inject
  d(
    "L3101",
    "error",
    "Mutating a !mut feature",
    "The target was declared `!mut`, which refuses every Export/Extract/Inject mutation. Remove `!mut` at the declaration or stop mutating it. `Inject(.force …)` inside `access.force` paths can override it.",
    { bad: "Container(.id(card) .config(!mut color: red))\nInject(.into(Page.card) card.color = blue)", good: "Container(.id(card) .config(color: red))\nInject(.into(Page.card) card.color = blue)" },
  ),
  d("L3102", "error", "Conflicting injection order", "Two Injects target the same feature with the same `.exeOrder`. Give them different orders so the result is unambiguous."),
  d("L3103", "warning", "Unordered injections", "Two Injects without `.exeOrder` target the same feature. They apply in file/line order; add orders to make intent explicit."),
  d("L3104", "error", "Rendered features are read-only", "`size`, `pos` and `visible` are measured from layout and cannot be injected or written."),
  d("L3105", "error", "Force outside access.force", "`Inject(.force …)` is only allowed in files matched by `access.force` in layr.yaml (or everywhere with `access.inject: open`)."),
  d("L3201", "error", "Layout cycle", "An object's size depends on a rendered feature that depends on the object itself. Break the cycle."),
  d("L3202", "warning", "Runtime layout cycle capped", "A dynamic rendered-feature dependency did not settle within two passes; the last value was kept."),
  d("L3301", "error", "Unresolved lookup path", "No object matches this lookup path. Paths descend by widget name (lowercase), slot name or id."),
  d("L3302", "error", "Private name", "Names starting with `_` are not reachable from outside their file."),
  d(
    "L3303",
    "error",
    "Ambiguous lookup path",
    "Several same-type siblings match this path segment. Pick one with a zero-based index: `column.text(0)`, `column.text(1)`, … or give the object an `.id`.",
  ),
  d("L3304", "error", "Index out of range", "The `(n)` index in a lookup path is larger than the number of matching siblings."),

  // L4 design scale
  d("L4001", "error", "Invalid DesignScale", "Frames need a design width, height and a non-overlapping `from` width."),
  d("L4002", "warning", "Mixed units in interpolation", "Per-frame values interpolate only when all are design lengths; mixed units step at frame boundaries."),

  // L5 motion
  d("L5101", "warning", "Not animatable", "This key is not animatable; Animate changes it instantly."),
  d("L5102", "error", "Writing a bound feature", "The feature is bound to an expression (for example `w: xDim ?? 100`). Write the source (`xDim`) instead, so there is one source of truth."),

  // L6 accessibility
  d("L6001", "error", "Image without alternative", "Images need `alt` text, or `decorative: true` if they carry no information."),
  d("L6002", "error", "Input without label", "Inputs, Toggles, Selects and Sliders need a `label` for screen readers."),
  d("L6003", "warning", "Button without accessible name", "Give the Button a `label` or text content."),
  d("L6101", "warning", "Font range fails zoom", "A font's largest size is more than 2.5× its smallest across frames; browser zoom may not reach 200 % (WCAG 1.4.4)."),
  d("L6102", "warning", "Text too small", "Effective body text is below 12 px at some frame."),

  // L7 addons
  d("L7001", "error", "Addon not installed", "The import refers to an addon that is not in node_modules. Run `layr add <addon>`."),
  d("L7002", "warning", "Addon incompatible", "The addon declares a LAYR range that does not include this version."),
  d("L7003", "error", "Invalid addon manifest", "The addon's package.json `layr` field is missing or invalid."),

  // L8 assets
  d("L8001", "info", "Single-resolution image", "Large images should provide per-frame sources (`src: (m: 'a.jpg', w: 'a@2x.jpg')`)."),

  // L9 interop
  d("L9001", "info", "React-target only", "Foreign React components and `.react { }` blocks run only on the React target. Set `targets: [react]` in layr.yaml to silence this."),
  d("L9002", "error", "Hooks outside .react", "React hooks may only be called inside a `.react { }` block."),
];

export const DIAGNOSTIC_BY_CODE: ReadonlyMap<string, DiagnosticDef> = new Map(DIAGNOSTICS.map((x) => [x.code, x]));
