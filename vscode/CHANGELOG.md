# Changelog

## 3.3.0

- Each LAYR project is checked by the `@dynshift/layr` it installs: the extension starts that version's language server, so a 3.1 project gets 3.1's rules and completions. The status bar shows the version; after `npm install` or `layr upgrade` the extension switches to the new one by itself.
- Files outside a project, and projects with nothing installed yet, use the version bundled with the extension. The setting `layr.server` (`project` or `bundled`) chooses.
- Follows LAYR 3.3: arithmetic on `hug` and `fill` sizes.

## 3.2.0

- Completion writes whole calls: `Container()` with the cursor inside, `Text('')`, and `Page`, `Widget`, `If`, `Each`, `Repeat` and `Duplicate` with their essential modifiers. No more unclosed brackets.
- Refactors on the object under the cursor: wrap with Container, Padding, Column, Row, Stack, Scroll, Mid, Expand, Animate, Position, If or Repeat; remove a wrapper and keep its child; move up and down; extract to a Widget.
- Format on save writes the tree one config entry, modifier and object per line, like Flutter.
- Deprecated forms are struck through; **Update all** (or **LAYR: Update deprecated forms in the project**) rewrites them after you choose it.
- Completion answers in a few milliseconds instead of recompiling the project on every keystroke, and no longer pops up on every space.
- Follows LAYR 3.2: `.wgt`, Duplicate, Repeat, RichText, per-object exeOrder chains.

## 3.1.0

- Follows LAYR 3.1: `.exeOrder` and `.posOrder` short forms, optional commas, `align` everywhere, and the formatter's one-object-per-line trees.

## 3.0.0

- First release for LAYR v3.
