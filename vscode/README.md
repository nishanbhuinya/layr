# LAYR for VS Code

Language support for [LAYR](https://layr.dynshift.com), the compiled UI language with Design Scale, deterministic layout and Export/Extract/Inject.

- **Completion that writes whole calls**: `Container` becomes `Container()` with the cursor inside; constructs come with their essential modifiers.
- **Refactors** on the object under the cursor: wrap with Container, Padding, Column, Row, Stack, Scroll, Mid, Expand, Animate, Position, If or Repeat; remove a wrapper and keep its child; move up and down; extract to a Widget.
- **Format on save** in canonical form, one object, modifier and config entry per line.
- **Diagnostics** with explanations and quick fixes (`L1002 … Did you mean \`w\`?`).
- **Guided upgrades**: deprecated forms are struck through, and **Update all** rewrites them, only when you choose it.
- **Navigation**: go to definition for widgets, ids, Functions and state; find every Export, Extract, Inject and Duplicate of an object.
- **Hover docs** for every widget, key and construct; syntax highlighting with TypeScript inside `{ }` blocks.
- **Your project's LAYR**: each project is checked by the `@dynshift/layr` version it installs (shown in the status bar), and the extension follows `npm install` and `layr upgrade` by itself.

## Install

Download the `.vsix` from [layr.dynshift.com/editor](https://layr.dynshift.com/editor) or from the [GitHub release](https://github.com/nishanbhuinya/layr/releases), then run **Extensions → … → Install from VSIX…** (or `code --install-extension layr-vscode.vsix`).

Open a folder containing `layr.yaml`. Create a project with `npx @dynshift/layr create my-app`. The extension uses the LAYR that project installs; until `npm install` runs, it uses its bundled version.
