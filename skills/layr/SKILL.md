---
name: layr
description: Write, fix and review LAYR (.layr) code and projects. LAYR is a compiled UI language (not React, not Flutter) with Design Scale units, deterministic layout, SAPI and TypeScript logic, and Export/Extract/Inject. Use whenever a project has layr.yaml or .layr files, or the user mentions LAYR, @dynshift/layr, the layr CLI, Design Scale, or Export/Extract/Inject.
---

# LAYR

LAYR is its own language. It compiles `.layr` files to CSS and React, but you do not write React or Flutter in it. Treat your React/Flutter instincts as the main source of mistakes.

## Work in this loop

1. Read `layr.yaml`, `src/app.layr` (design frames, theme colours) and the files you will touch.
2. Write LAYR using the rules below and the references.
3. `npx layr format` (canonical form).
4. `npx layr analyze --json` and fix every error and warning. `npx layr explain <code>` explains any code. Repeat until clean.
5. For UI changes, `npx layr build` must succeed; `npx layr test` screenshots every page at every design frame.

If the `layr` MCP server is available, `check_snippet`, `get_widget` and `explain_error` answer the same questions without a shell.

## The rules

- **`( )` holds LAYR structure; `{ }` holds TypeScript.** Objects, config, children and SAPI steps go in parentheses. TypeScript goes only in `{ }` blocks (`.def { }`, `.fnc { }`, `.react { }`, `.load { }`).
- **Objects:** `Widget(.id(x) .preset(p) .config(key: value …) .at(frame, key: value) .fnc(action) .on(event: action) .obj(child))`. Several children: `.objs(a, b)` or positional `Column(a, b)`.
- **Items** are separated by line breaks or commas. Two modifiers may share a line with a space: `.config(w: 2) .obj(x)`.
- **Numbers are design pixels** (`w: 200`). Use `px` only for hairlines, `%` for parent-relative sizes. Never `rem`, `em`, `vw`, `clamp()`.
- **Sizes:** `w`, `h`, `size` with a length, `fill` (share spare space) or `hug` (fit content, the default). `x`/`y` mean position and axis, never size.
- **Alignment:** `objAlign: mid` (2-D: `topLeft … bottomRight`); Row/Column use `xAlign` (horizontal) and `yAlign` (vertical): `start mid end between around evenly stretch`.
- **Insets:** `all(16)`, `sym(x: 16, y: 8)`, `only(left: 16, top: 8)` (named only).
- **Colours:** `#0d0d0d`, `0xFF0D0D0D`, named (`white`, `blue`), theme names from `app.layr`, methods `.alpha(50%)`, `.shade(n)`, `.tint(n)`, `.invert`, `.mix(c, t)`.
- **Text:** `Text('Hello $name ${a + b}')`; semantic type with `.config(type: h1)`. Single quotes.
- **Comments are `//` and `/* */`.** `#` always starts a colour.
- **State:** `var int n = 0`, `const txt t = '…'`, `bind txt label = '…'` (derived). Reading state in config or text makes it reactive. Page state is kept for the session.
- **Logic:** `Function(.name(f) .param(ref int n) .def { n++ })` or SAPI steps `.def(.if(.cnd(test) .exe(stmt)) .fb(.exe(stmt)))`. `ref` params receive the caller's state.
- **Events:** `.fnc(action)` is the primary action (press; change for inputs with the new `value`; submit for forms). Others: `.on(hover: …, key: …, mount: …)`.
- **Conditions and lists:** `If(.cnd(test) .obj(A) .fb(B))`, `Each(.of(list) .as(item, i) .obj(…))`. Never `.map()` or ternaries that return objects in layout.
- **Pages:** `Page(.name(X) .route('/x') … Scaffold(.body(…)))`, one root object. Navigation: `Link(.config(to: Page))`, `go(Page)`.
- **Widgets:** `Widget(.name(Card) .param(req txt title, color tint = blue) .obj(…))`; read `param.title`; `.obj` alone forwards the caller's object.
- **Export/Extract/Inject:** address objects by `Page.id` or lookup path (`Page.scaffold.body.column.text(1)`); a path continues into a widget instance (`Page.….card(1).text(0)` reaches that one instance, `Card.text(0)` every instance). `Extract(.from(Page.card) .exeOrder(-1) insets pad = card.padding)` reads the declared value (without an order it reads the final value, after every Inject); `Inject(.into(Page.card) .exeOrder(0) card.padding = card.padding * 2)` adds a reversible layer. Give Injects on the same feature different `exeOrder`s. Never mutate `!mut` features.
- **Accessibility is required:** `alt` (or `decorative: true`) on Image, `label` on Input/Toggle/Select/Slider and Buttons without content.
- **React packages:** import the component and use it as an object with `.props(...)`; hooks only inside `.react { }`.
- **JSX is allowed where an object goes**, for HTML and React components that LAYR has no widget for: `<section className="x">Text('LAYR inside')</section>` or `.obj(<Chart data={rows} />)`. Attributes are `"strings"` or `{ ts }`; LAYR objects inside keep layout and lookup paths (`Page.….section.text`). Prefer LAYR widgets for layout; reach for JSX for foreign components and plain HTML.

## Mistakes to avoid

| Wrong (React/Flutter/CSS habit) | LAYR |
|---|---|
| `<Container width={200}>` or JSX | `Container(.config(w: 200))` |
| `width: 200`, `height: 100` | `w: 200`, `h: 100` (aliases work but are not canonical) |
| `x: 200` meaning width | `w: 200` |
| `padding: 16px` / `EdgeInsets.all(16)` | `padding: all(16)` |
| `Center(...)`, `SizedBox(height: 20)`, `Expanded` | `Mid(...)`, `Gap(20)`, `Expand` |
| `mainAxisAlignment: center` | `xAlign: mid` in a Row, `yAlign: mid` in a Column |
| `onClick`, `onPressed` | `.fnc(action)` |
| `useState`, `setState` | `var` declarations; assign them in actions |
| `className`, `style={{…}}` | `.config(...)`; `.preset(...)` for reuse |
| `# comment` | `// comment` |
| `items.map((i) => Row(...))` | `Each(.of(items) .as(i) .obj(Row(...)))` |
| Media queries, breakpoints | `.at(t, w: 400)` per design frame |
| Hard-coded pixels everywhere | design numbers (`200`), `px` only for hairlines |

## References

Read the one you need; all are generated from the compiler and the docs, for this LAYR version.

- `reference/widgets.md`: every widget, config key (type, default, aliases), slot and event.
- `reference/diagnostics.md`: every diagnostic code with its explanation.
- `reference/syntax.md`, `objects.md`, `widgets-guide.md`: the language.
- `reference/state.md`, `functions.md`, `pages.md`: logic and apps.
- `reference/layout.md`, `design-scale.md`, `animation.md`: layout, responsiveness, motion.
- `reference/export-extract-inject.md`: reading and changing objects from anywhere.
- `reference/react.md`, `addons.md`, `cli.md`, `deploy.md`: ecosystem.
