# Changelog

All notable changes to `@dynshift/layr`. The format follows [Keep a Changelog](https://keepachangelog.com), and the project uses semantic versioning.

## 3.1.0

Fixes from the first days of LAYR 3, a few long-wanted shorthands, and a reference that teaches. Everything written for 3.0.0 still compiles; `layr format` updates old spellings.

### Added

- `.exeOrder` short forms `.exeOrd`, `.eOrd` and `.eO`; unary `+` in orders (`.exeOrder(+3)`).
- `Order(.posOrder(n))` replaces `.pos(n)` (still accepted, with `.pOrd` and `.pO`), so `pos` means only the measured position.
- `align` everywhere: Rows, Columns and Wraps take `align: bottomRight` for both axes; `align` and `alignment` are accepted wherever an alignment key exists. Grid accepts `columns` for `cols`.
- Commas between items are optional: `Column(Text('a') Text('b'))`, and a spaced `.modifier(` after a value starts the next modifier.
- `size` can be injected and written where an object has a `size` key of its own (a Text's font size); reading it still gives the measured size.
- Svg `color` fills a one-colour SVG with that colour; Icon `color` is the icon's colour, with `icons()` to register SVGs.
- Form controls take the theme's accent colour; disabled Buttons look disabled; Buttons show no tap flash or text selection on touch screens.
- The formatter writes each object of a multi-line tree on its own line, so the hierarchy reads down the indentation.
- The website's widget reference: live, themed examples with "Try it" for every widget, and previous/next links.

### Fixed

- An Inject whose target is reached by a path and has an `.id` no longer loses its target name (`text.color = …` failed with L3301).
- Layout rules reach through Animate, Focus and If wrappers in stacking and adapting rows (a fill child inside Animate collapsed to 0 high on phones).
- A Row inside a sideways Scroll stays on one line and scrolls instead of wrapping.
- A Position pinned to opposite edges lets its object fill it (`w: fill`, `h: fill`).
- Subtract and Mask use each layer's real shape: a base offset outside the others (a negative `bottom`) keeps the part the cut does not cover, rounded mask layers keep their corners, and no hairline shows around rounded cuts.
- A colour name stays a colour where a colour is expected, even if an object has that id.
- exeOrder layers insert in O(log n) and reads below an order stop early; the docs say precisely what `.exeOrder(k)` reads.

## 3.0.0

LAYR 3: a compiled UI language, replacing the 1.x React component library. `npm install @dynshift/layr` now installs LAYR 3; LAYR 1.x stays installable as `@dynshift/layr@v1`.

### Added

- The `.layr` language: objects, config, slots, ids, presets, per-frame config, conditions and lists, state (`var`, `const`, `bind`), functions as SAPI steps or TypeScript, arrow functions, one canonical form.
- The compiler to static CSS and React, with diagnostics for every problem and `layr explain`.
- Design Scale: design frames (m, t, w, uw and custom), ds units, interpolation between frames, subtree scaling, viewport units.
- Deterministic layout: fixed, hug and fill sizing; automatic wrap and stack; `Adapt`; sticky positioning; scroll edge fades.
- Export, Extract and Inject with ordered, reversible layers and `!mut`. What an object shows is a feature too: a Text's content, a slot's objects (`obj`, `objs`, named slots), a widget instance's params and `obj`, and a React component's props. Objects written as values (`card.obj = Text('Hi')`) compile like layout objects.
- JSX inside LAYR (`.obj(<div/>)`) and LAYR inside JSX.
- Buttons answer a press: a small scale on press and a brighten on hover, with none under reduced motion.
- Animate with springs and enter and exit motion.
- Themes with light and dark colours as CSS variables.
- React interop in both directions; `@dynshift/layr/tsx` components.
- The `layr` CLI: create, dev, build with prerendering (including dynamic routes), preview, format, analyze, explain, test, addons, skills, lsp, mcp.
- The language server, the VS Code extension, the LAYR Skill and the MCP server.
- Official addon: google_fonts.

LAYR 1.x continues on the `v1` branch; `npm install @dynshift/layr@v1` installs it.
