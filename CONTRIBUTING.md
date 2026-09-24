# Contributing to LAYR

Thank you for helping. Issues, documentation fixes, addons and code are all welcome.

## Report a problem

Open an issue with the smallest `.layr` file that shows it, what you expected, what happened, and the output of `npx layr doctor`. A playground link (the Share button) is the best reproduction.

## Work on LAYR

```bash
git clone https://github.com/nishanbhuinya/layr.git
cd layr
pnpm install
pnpm test          # every package's unit tests
pnpm typecheck
pnpm test:e2e      # Playwright across frames
pnpm site          # the website, locally
```

Node 22 and pnpm 11. Before a pull request:

- `pnpm test` and `pnpm typecheck` pass.
- New behaviour has a test, and the docs say how to use it. Every `layr` snippet in `docs/content` must compile (`pnpm test` checks this) and be in canonical form (`pnpm check:docs`).
- The schema (`packages/model/src/schema.ts`) is the single source for widgets, keys and aliases; generated files come from `pnpm gen`.
- Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`).

## List an addon

Addons are published to npm by their authors. To list one in the Library, add a file under `site/content/addons/`; see [Publish an addon](https://layr.dynshift.com/library/publish).

## Conduct

Be kind and specific. Critique code, not people.
