<!-- Title: a Conventional Commit, e.g. "fix(compiler): keep ?. on rendered features". It becomes the commit in main. -->

## What and why

<!-- What changes for someone writing LAYR, and why. Link the issue: "Fixes #123". -->

## How it stays LAYR

<!-- Delete what does not apply. -->
- [ ] Still readable at a glance: the code's shape is still the UI's shape.
- [ ] Deterministic: the same file resolves the same way on every screen; any adaptation is explainable.
- [ ] Widgets, keys, aliases and diagnostics come from the schema, not a copied table.
- [ ] A new error has a diagnostic code with an explanation and a fix.

## Checks

- [ ] `pnpm typecheck` and `pnpm test` pass.
- [ ] A test covers the change (a fix fails without it).
- [ ] Docs explain new behaviour with an example; `pnpm check:docs` passes and `pnpm gen` was run.
- [ ] `pnpm test:e2e` passes, if rendering changed.

## Screenshots

<!-- For anything visible: before and after, at a phone and a desktop width. -->
