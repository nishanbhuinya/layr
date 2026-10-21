# Changelog

All notable changes to `@dynshift/layr`. The format follows [Keep a Changelog](https://keepachangelog.com), and the project uses semantic versioning.

## 3.2.0

New objects (Duplicate, Repeat, RichText), each object's own exeOrder chain, guided upgrades, the canonical form that reads down the page, and an editor that keeps up. Code written for 3.1 compiles, except operations that share an order on one object (see Changed); `layr upgrade` updates the one renamed form.

### Added

- `Duplicate` shows a copy of another object of the same Page or Widget. The copy follows the original's config, writes and Injects below its `.exeOrder` (all of them without one), takes its own `.config` (`Card.text.weight: bold` reaches inside), and is a target by id and path. `.tar` is accepted for `.from`.
- `Repeat(.times(n) …)` shows an object n times, with `rep.index`, `rep.count`, `rep.first`, `rep.last`, `.as(i)` and `.sep(…)` between repeats; n can be state.
- `RichText` writes styled runs inside one string: `(blue)[Blue]`, `(green.50, 24, bold)[…]`, `(hL.gold.30)[…]`, `(link: /docs)[…]`, `*bold*`, `_italic_`, `` `code` ``, `~strike~`, `\n` and paragraphs; a slash shows markup as written (`/(blue)[Blue]`). Values from `$name` stay plain text. Unknown styles are L1018. Its text may run over several lines between quotes.
- `layr chain` lists the objects that Export, Extract, Inject and Duplicate change and read, and one object's chain in order (`--all`, `--json`; alias `layr eied`).
- `layr upgrade` lists deprecated forms and rewrites them once you agree (`--check`, `--yes`). Deprecated forms are warning L1017; `layr dev` mentions them; the VS Code extension strikes them through and offers **Update all**.
- Params with listed values: `align edge = in | mid | out` (the first is the default); a param named `obj` is what the caller puts in `.obj(...)`.
- `textColor` on every box. Text on a painted object picks a readable ink (dark on light paint, light on dark, theme colours through `--layr-on-<name>` in light and dark mode); themes set the inks with `onLight` and `onDark`.
- Animate: `delay`, `resize: animate`, and `duration` with springs (the spring's curve over that time).
- `Link(.config(download: true))` for files to save.
- The VS Code extension: completion that writes whole calls (`Container()` with the cursor inside, constructs with their modifiers); refactors (wrap with Container, Padding, Column, Row, Stack, Scroll, Mid, Expand, Animate, Position, If or Repeat; remove a wrapper; move up and down; extract to a Widget with the state it reads as params); auto-closing backticks.
- The website: the [VS Code extension](https://layr.dynshift.com/editor) page with a download built from the same commit, this changelog at [/changelog](https://layr.dynshift.com/changelog), and RichText, Repeat and Duplicate in the docs. The `.vsix` is attached to each GitHub release.

### Changed

- **On one object, every operation takes its own `.exeOrder`.** Two Exports, Extracts, Injects or Duplicates on the same object at the same order are an error whatever features they touch (L3102, with the nearest free order as the fix); before, only two Injects of the same feature were. Two unordered Injects of the same feature are an error (L3103, a warning before).
- A Widget's body is `.wgt(...)`. `.obj(...)` and `.body(...)` there still compile, deprecated (L1017), until 4.0.
- `layr format` puts every config entry, modifier and object of a tree on its own line when there are two or more, and nested groups such as `.border(...)` after the keys. Value calls (`sym(x: 8, y: 4)`) and single items (`.name(Card)`, `Text('Hi')`) stay inline.
- A Position pins to its box, the nearest Container, Stack, Scroll or Grid around it.
- A Scaffold's body lays its objects out like a Column: they hug, as everywhere else, until they `fill`.
- `layr upgrade` now upgrades your code; `layr update` still updates addons.

### Fixed

- The playground and docs editors no longer fail with "reading 'get'" when an edited page declares new state; a page's kept state is rebuilt when a new version declares more (also on hot reload).
- A Position inside a Column or Container no longer escapes to the page's corner.
- A Container directly in a Scaffold's body hugs its content instead of stretching.
- Text on a dark Container is readable without a colour of its own.
- `\n` starts a new line in a Text.
- Animate: a label that grows no longer wraps onto several lines while its box animates; `duration` applies with springs; the starting size follows window resizes.
- Arithmetic on a `hug` or `fill` size (`box.h + 10`) is a compile error that says what to do (L2004) instead of collapsing the box.
- A construct's objects written in place (`Each(.of(xs) Text(item))`) render; they were dropped.
- `#` used as a comment explains that comments start with `//`.

### Performance

- The language server answers completion from the last compile instead of recompiling the project on every keystroke: 33–82 ms per keystroke became 1–6 ms on the 23-file site project. Diagnostics are sent only for files whose list changed.

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
