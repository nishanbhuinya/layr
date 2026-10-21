---
title: VS Code extension
description: "Download the LAYR extension for VS Code: completion that closes its brackets, refactors, format on save, diagnostics with fixes and guided upgrades."
section: Reference
---

# VS Code extension

The LAYR extension gives VS Code the language server that ships with `@dynshift/layr`: the same compiler, diagnostics and formatter as the CLI, as you type.

[Download for VS Code (.vsix)](/download/layr-vscode.vsix)

The file is built from the same commit as this site. The extension is not in the Visual Studio Marketplace yet, so it installs from the file.

## Install

1. Download `layr-vscode.vsix` with the button above.
2. In VS Code, open the Extensions view, then **…** → **Install from VSIX…**, and pick the file.
   From a terminal, `code --install-extension layr-vscode.vsix` does the same.
3. Open a folder that has a `layr.yaml`, or create one with `npx @dynshift/layr create my-app`.

To update, install the newer file the same way. **LAYR: Restart language server** in the Command Palette reloads it without restarting VS Code.

## What you get

- **Completion that writes whole calls.** Picking `Container` writes `Container()` with the cursor inside; `Text` writes `Text('')`; `Page`, `Widget`, `If`, `Each`, `Repeat` and `Duplicate` come with their essential modifiers. Keys, values, colours, frames and ids complete in context.
- **Refactors on the object under the cursor** (the light bulb, or **Ctrl+.**):
  - **Wrap with** Container, Padding, Column, Row, Stack, Scroll, Mid, Expand, Animate, Position, If or Repeat.
  - **Remove** a wrapper and keep its child.
  - **Move up** and **Move down** among its siblings.
  - **Extract to a Widget**: the object becomes a `Widget(.name(…) .wgt(…))` at the end of the file, and the state it reads becomes params its caller passes.
- **Format on save** in canonical form: every object, modifier and config entry of a tree on its own line, so the code reads like the UI it builds.
- **Diagnostics with explanations and fixes**, from the same catalogue as `layr explain` and the [diagnostics reference](/errors).
- **Guided upgrades.** When a form is deprecated, the extension says what changed and where, and offers **Update all**. Nothing changes until you choose it, and one undo reverts it. **LAYR: Update deprecated forms in the project** runs it from the Command Palette, and `layr upgrade` does the same in a terminal.
- **Navigation.** Go to definition for widgets, ids, Functions and state; Find All References on an id lists every Export, Extract, Inject and Duplicate of that object.
- **Hover docs** for every widget, key and construct, and syntax highlighting with TypeScript inside `{ }` blocks.

## Commands

| Command | What it does |
|---|---|
| LAYR: Restart language server | Reloads the project and the server |
| LAYR: Explain a diagnostic code | Opens the reference for a code such as `L3102` |
| LAYR: Update deprecated forms in the project | Applies every deprecation fix, after you confirm |
