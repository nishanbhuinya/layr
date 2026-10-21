# Diagnostics

Generated from the LAYR diagnostics catalogue. `layr explain <code>` prints any entry.

## L0001: Unexpected character (error)

The file contains a character that cannot start any LAYR token.

## L0002: Unterminated string (error)

A string was opened with `'` or `"` but not closed on the same line.

## L0003: Unterminated comment (error)

A `/*` comment has no closing `*/`.

## L0004: Unterminated block (error)

A `{` TypeScript block has no matching `}`.

## L0005: Unmatched brace (error)

A `}` appears without an opening `{`.

## L0010: Expected token (error)

The parser expected a specific token here, usually a closing `)`.

## L0011: Unexpected token (error)

This token cannot start an item. Items are modifiers (`.config(...)`), props (`key: value`), declarations or values.

## L0012: Missing separator (error)

Commas between items are optional, but an item cannot be followed on the same line by an operator that does not continue it. Put the next item on its own line, or add a `,`.

Wrong:

```layr
Row(Text('a') ] Text('b'))
```

Right:

```layr
Row(Text('a') Text('b'))
```

## L0013: Invalid import (error)

Imports follow TypeScript syntax: `import { a } from 'pkg'`, `import X from './x.layr'`.

## L0014: Expected a value (error)

A value (number, string, colour, name or call) was expected here.

## L1001: Unknown widget (error)

No core widget, project widget or addon widget has this name. Check the spelling or import it.

## L1002: Unknown config key (error)

This widget has no such config key. The message lists the closest keys.

Wrong:

```layr
Container(.config(widht: 200))
```

Right:

```layr
Container(.config(w: 200))
```

## L1003: Wrong value type (error)

The value does not match the key's type (for example a colour where a length is expected).

## L1004: Unknown value (error)

This identifier is not one of the values the key accepts.

## L1005: Unknown name (error)

The name is not a declared var/const/bind, param, Function, import or object id in scope.

## L1006: Unknown modifier (error)

This modifier does not exist on this widget or construct.

## L1007: Wrong slot (error)

The object was given to a slot that does not accept it (for example several objects in a single `.obj`).

## L1008: Missing required value (error)

A required param or slot was not provided.

## L1009: Duplicate id (error)

Two objects in the same Page or Widget share an `.id`. Ids must be unique per definition.

## L1010: Duplicate declaration (error)

The name is already declared in this scope.

## L1011: Non-canonical spelling (info)

An alias or non-canonical form was used. `layr format` rewrites it to the canonical form.

## L1012: Duplicate config key (error)

The same key is set twice in one `.config`.

## L1013: Invalid Page (error)

A Page needs `.name(...)` and exactly one root object (usually a Scaffold).

## L1014: Invalid Widget (error)

A Widget needs `.name(...)` and one `.obj(...)` root.

## L1015: Unknown frame (error)

`.at(frame, ...)` names a frame that the active DesignScale does not define.

## L1016: Unused declaration (warning)

The declaration is never read.

## L1018: Not a RichText style (warning)

In RichText, `(…)[text]` styles the text in brackets, and the parentheses hold styles: a colour (`blue`, `#000`, a theme colour, `green.50` for 50% opacity), a size (`24`), `weight.700` or `bold`, `italic`, `underline`, `strike`, `code`, `hL.colour` (a highlight) or `link: /path`. Something else there is shown as written. To show parentheses before brackets on purpose, write `/(`.

Wrong:

```layr
RichText('(blu)[Blue]')
```

Right:

```layr
RichText('(blue)[Blue]')
```

## L1017: Deprecated form (warning)

This form still compiles but has a newer spelling, and a later major version removes it. The message names the new form. `layr upgrade` lists every deprecated form in the project and rewrites them once you agree; in VS Code the quick fix or **Update all** does the same.

Wrong:

```layr
Widget(.name(Card) .obj(Container()))
```

Right:

```layr
Widget(.name(Card) .wgt(Container()))
```

## L2001: fill on an unbounded axis (error)

`fill` shares remaining space, but a scrolling axis has no end, so there is nothing to share. Give the object a length or `hug`, or bound the scroll area.

Wrong:

```layr
Scroll(Column(Container(.config(h: fill))))
```

Right:

```layr
Scroll(Column(Container(.config(h: 400))))
```

## L2003: Invisible box (warning)

A `hug` Container with no child is 0×0, so its paint is never visible. Give it a size.

## L2004: Arithmetic on a layout size (error)

`w` and `h` written as `hug` or `fill`, or not written at all, are sizes the layout works out; they are not numbers, so `box.w + 10` has nothing to add to. Give the size a length, change what the box hugs (its `padding`, its content), or read the measured size `box.size.w`. Do not feed a measured size back into the same size: it would grow on every measure.

Wrong:

```layr
Inject(.into(Home.button) button.h = button.h + 10)
```

Right:

```layr
Inject(.into(Home.button) button.padding = all(10))
```

## L2101: Overflow cannot adapt (warning)

The content cannot fit and no adaptation applies (for example a fixed child larger than its fixed parent on both axes). It is clipped. Make a size flexible or set `overflow` explicitly.

## L2102: Layout adapted (info)

At some frame this Row wraps or stacks. The message says where. Set `overflow` to make the choice explicit.

## L3101: Mutating a !mut feature (error)

The target was declared `!mut`, which refuses every Export/Extract/Inject mutation. Remove `!mut` at the declaration or stop mutating it. `Inject(.force …)` inside `access.force` paths can override it.

Wrong:

```layr
Container(.id(card) .config(!mut color: red))
Inject(.into(Page.card) card.color = blue)
```

Right:

```layr
Container(.id(card) .config(color: red))
Inject(.into(Page.card) card.color = blue)
```

## L3102: Two operations share an order on one object (error)

Every Export, Extract, Inject and Duplicate on an object takes its own place in that object's chain: `.exeOrder` runs from the most negative to the most positive, and two operations on the same object cannot share a number (whichever features they touch), because then nothing says which comes first. Operations on different objects may share numbers. The fix suggests the nearest free order; `layr chain <object>` lists the chain.

Wrong:

```layr
Inject(.into(Home.card) .exeOrder(10) card.w = 200)
Extract(.from(Home.card) .exeOrder(10) len w = card.w)
```

Right:

```layr
Inject(.into(Home.card) .exeOrder(10) card.w = 200)
Extract(.from(Home.card) .exeOrder(11) len w = card.w)
```

## L3103: Two unordered Injects on one feature (error)

Two Injects without `.exeOrder` change the same feature of an object, so nothing says which comes first. Give at least one of them an order. (Unordered Injects of different features are fine; they apply after the ordered ones. An unordered Extract reads the final value.)

## L3104: Rendered features are read-only (error)

`pos` and `visible` are measured from layout and cannot be injected or written. `size` is measured too, but an object with a `size` key of its own (a Text's font size, a box's size) takes writes and Injects there; reading `size` still gives the measurement.

## L3105: Force outside access.force (error)

`Inject(.force …)` is only allowed in files matched by `access.force` in layr.yaml (or everywhere with `access.inject: open`).

## L3201: Layout cycle (error)

An object's size depends on a rendered feature that depends on the object itself. Break the cycle.

## L3202: Runtime layout cycle capped (warning)

A dynamic rendered-feature dependency did not settle within two passes; the last value was kept.

## L3203: Extract reads its own Inject (error)

An Extract without `.exeOrder` reads the final value, after every Inject. An Inject that uses that value to change the same feature would read its own output. Give the Extract an order at or below the Inject's: it then reads the value under that Inject.

Wrong:

```layr
Extract(.from(Store.card) insets base = card.padding)
Inject(.into(Store.card) .exeOrder(0) card.padding = base * 2)
```

Right:

```layr
Extract(.from(Store.card) .exeOrder(-1) insets base = card.padding)
Inject(.into(Store.card) .exeOrder(0) card.padding = base * 2)
```

## L3301: Unresolved lookup path (error)

No object matches this lookup path. Paths descend by widget name (lowercase), slot name or id.

## L3302: Private name (error)

Names starting with `_` are not reachable from outside their file.

## L3303: Ambiguous lookup path (error)

Several same-type siblings match this path segment. Pick one with a zero-based index: `column.text(0)`, `column.text(1)`, … or give the object an `.id`.

## L3304: Index out of range (error)

The `(n)` index in a lookup path is larger than the number of matching siblings.

## L3305: A Duplicate inside what it copies (error)

A Duplicate shows a copy of its `.from` object in its own place. Inside that object, the copy would contain the Duplicate, which would contain a copy, and so on. Put the Duplicate outside the object it copies.

## L4001: Invalid DesignScale (error)

Frames need a design width, height and a non-overlapping `from` width.

## L4002: Mixed units in interpolation (warning)

Per-frame values interpolate only when all are design lengths; mixed units step at frame boundaries.

## L5101: Not animatable (warning)

This key is not animatable; Animate changes it instantly.

## L5102: Writing a bound feature (error)

The feature is bound to an expression (for example `w: xDim ?? 100`). Write the source (`xDim`) instead, so there is one source of truth.

## L6001: Image without alternative (error)

Images need `alt` text, or `decorative: true` if they carry no information.

## L6002: Input without label (error)

Inputs, Toggles, Selects and Sliders need a `label` for screen readers.

## L6003: Button without accessible name (warning)

Give the Button a `label` or text content.

## L6101: Font range fails zoom (warning)

A font's largest size is more than 2.5× its smallest across frames; browser zoom may not reach 200 % (WCAG 1.4.4).

## L6102: Text too small (warning)

Effective body text is below 12 px at some frame.

## L7001: Addon not installed (error)

The import refers to an addon that is not in node_modules. Run `layr add <addon>`.

## L7002: Addon incompatible (warning)

The addon declares a LAYR range that does not include this version.

## L7003: Invalid addon manifest (error)

The addon's package.json `layr` field is missing or invalid.

## L8001: Single-resolution image (info)

Large images should provide per-frame sources (`src: (m: 'a.jpg', w: 'a@2x.jpg')`).

## L9001: React-target only (info)

Foreign React components and `.react { }` blocks run only on the React target. Set `targets: [react]` in layr.yaml to silence this.

## L9002: Hooks outside .react (error)

React hooks may only be called inside a `.react { }` block.
