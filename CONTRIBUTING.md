# Contributing to LAYR

Thank you for helping. Bug reports, documentation fixes, addons and code are all welcome, and a good bug report is as valuable as a pull request.

- **Questions and ideas:** [Discussions](https://github.com/nishanbhuinya/layr/discussions).
- **Bugs and concrete proposals:** [Issues](https://github.com/nishanbhuinya/layr/issues/new/choose).
- **Security problems:** never in public. See [SECURITY.md](SECURITY.md).

Everyone who takes part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## What LAYR is meant to be

Every change is weighed against these. A pull request that makes LAYR more capable but less like this is usually declined, so if you are unsure, ask in Discussions first.

- **Easy to read at a glance.** Layout is the program: a file's shape is the UI's shape, objects nest the way they render, and logic stays collapsible (`.config`, `.def`, `{ }`). If a reader has to run the code in their head to see the layout, the design is wrong.
- **Deterministic.** The same file resolves the same way on every screen. Adaptation (a row that wraps or stacks, text that scales) follows fixed rules the compiler can explain; nothing depends on luck or load order. `layr analyze --explain` must be able to say why a value is what it is.
- **Compiled.** `.layr` → compiler → static CSS and a React module. Checks happen at compile time, and every problem has a code, an explanation and a fix (`L1007`, `L3101`…). New errors get a diagnostic in the catalogue, not a thrown string.
- **Design units, not CSS units.** Numbers are design pixels from your design's frames; Design Scale turns them into every screen. No media queries in user code.
- **One meaning per line, one canonical form.** Every property has one resolution order. Aliases are accepted when writing and `layr format` stores one spelling.
- **Protected by default, changeable through Export/Extract/Inject.** Nothing changes another object from outside except an explicit Extract, Inject or write, ordered by `exeOrder` and reversible; `!mut` refuses even those. Objects, text and widget params are features like any other.
- **One source of truth.** The schema (`packages/model/src/schema.ts`, `diagnostics.ts`) describes every widget, key, alias and diagnostic. The docs, the AI Skill, the editor support and the formatter read from it; never copy its tables by hand.
- **True claims.** Everything the docs or the site say must be true in the compiler and the browser. When a claim is wrong, fix LAYR, not the sentence.
- **React is the first render target, not the identity.** React components work inside LAYR and LAYR inside React; the language itself stays target-neutral.

## Set up

```bash
git clone https://github.com/nishanbhuinya/layr.git
cd layr
pnpm install
pnpm test          # unit tests of every package
pnpm typecheck
pnpm test:e2e      # Playwright, in real browsers, across design frames
pnpm site          # the website and docs, locally
```

Node 22 and pnpm 11. The repository is one workspace:

| Package | What it holds |
|---|---|
| `packages/model` | The schema, values, lowering to CSS, Design Scale |
| `packages/compiler` | Lexer, parser, checks, CSS and React emitters |
| `packages/runtime` | The React-free runtime: signals, the E/E/I cascade, frames |
| `packages/react` | The React render target |
| `packages/node`, `packages/cli` | Project loading, the `layr` command and the Vite plugin |
| `packages/lsp`, `vscode` | Editor support |
| `packages/layr` | `@dynshift/layr`, the package people install |
| `addons/*` | Official addons, published as `@dynshift/layr-<name>` |
| `docs/content`, `site` | The docs and layr.dynshift.com |
| `skills/layr` | The AI Skill (its references are generated from the docs) |

## Make a change

1. **Talk first about anything large.** A new widget, key, syntax or diagnostic changes the language for everyone: open a feature request or a discussion before you write it. Small fixes need no permission.
2. **Branch from `main`** in your fork and keep the pull request to one change.
3. **Test it.** A bug fix comes with a test that fails without it. Compiler behaviour belongs in `packages/compiler/test`; behaviour in the browser in `tests/e2e`.
4. **Document it.** New behaviour is explained in `docs/content` with a live example. Every `layr` block there must compile (`pnpm test`) and be canonical (`pnpm check:docs`); run `pnpm gen` after changing the schema or the docs.
5. **Check it:** `pnpm typecheck`, `pnpm test`, `pnpm check:docs`, and `pnpm test:e2e` when you touched rendering.
6. **Open the pull request** and fill in the template.

Commits and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org): `feat(compiler): …`, `fix(react): …`, `docs: …`. Pull requests are squash-merged, so the title becomes the commit in `main`, and you stay its author.

## Review

- CI must pass: types and unit tests, the docs checks, Playwright, the website build and the packed-package smoke test.
- A maintainer (see [CODEOWNERS](.github/CODEOWNERS)) reviews every pull request. Expect questions about readability and determinism before questions about style.
- Review conversations must be resolved before merging. New pushes after an approval need a fresh look.
- Changes ship in the next release and are listed in [CHANGELOG.md](CHANGELOG.md).

## Addons

Anyone can write and publish an addon to npm. To list yours in the Library, add a file under `site/content/addons/`; see [Publish an addon](https://layr.dynshift.com/library/publish).

## Licence

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE) of this repository. The LAYR name and marks are covered by [TRADEMARK.md](TRADEMARK.md).
