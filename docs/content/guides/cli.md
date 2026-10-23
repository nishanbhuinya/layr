---
title: CLI
description: Every layr command.
order: 42
---

# CLI

`layr` comes with `@dynshift/layr`. Install it once with `npm i -g @dynshift/layr` and type `layr` anywhere: inside a project it runs the version that project installs, so the commands, the checks and the build always match the project. `layr --version` shows which version that is. Without a global install, use `npx @dynshift/layr <command>`, or the project's `npm run` scripts. Always write the scoped name with `npx`: the unscoped `npx layr` fetches an unrelated npm package outside a project.

| Command | What it does |
|---|---|
| `layr create <name>` | New project (`--template app` or `blank`) |
| `layr create addon <name>` | New addon |
| `layr dev` | Dev server with reload on save (`--port`, `--host`) |
| `layr build` | Static site in `dist/`, routes prerendered (`--base`, `--out`, `--no-prerender`) |
| `layr preview` | Serve `dist/` |
| `layr format` | Canonical form (`--check` for CI) |
| `layr analyze` | All diagnostics (`--json`, `--info`, `--explain Page.id.feature`) |
| `layr explain <code>` | Explain a diagnostic, e.g. `layr explain L3102` |
| `layr chain [object]` | What Export, Inject, Extract and Duplicate (EIED) change and read; one object's chain in exeOrder (`--all`, `--json`). Alias `layr eied` |
| `layr upgrade` | Move the project to the latest LAYR (`--to 3.3` for another), then rewrite deprecated forms, each step once you agree (`--check` for CI, `--yes` to agree in advance, `--code` for the code step alone) |
| `layr test` | Screenshot every route at every design frame and compare (`--update`, `--frames m,w`) |
| `layr add <addon>` | Install addons |
| `layr remove <addon>` | Uninstall addons |
| `layr update [addon]` | Update addons (LAYR itself: `layr upgrade`) |
| `layr outdated` | Addons with newer versions |
| `layr search <query>` | Search addons |
| `layr info <addon>` | An addon's details |
| `layr pack` | Validate and pack an addon |
| `layr publish` | Validate and publish an addon to npm |
| `layr eject <addon>` | Copy an addon's source into your project |
| `layr docs` | API docs for an addon's widgets |
| `layr skills install` | Give AI agents the LAYR Skill |
| `layr doctor` | Check the environment and project |
| `layr lsp` | Language server (stdio), used by editors |
| `layr mcp` | MCP server (stdio), used by AI agents |

## Upgrading

`layr upgrade` moves a project to a newer LAYR in two steps, and asks before each one.

**LAYR itself.** It finds the latest `@dynshift/layr` (or the one `--to` names: `--to 3.3`, `--to 3.2.1`, `--to next`), says what will change, and once you agree installs it with the project's package manager (npm, pnpm, yarn or bun, in the dependency field it was in), sets `layr:` in `layr.yaml`, and refreshes an installed Skill:

```text
$ layr upgrade
LAYR 3.1.0 → 3.3.0
  What changed: https://layr.dynshift.com/changelog
  npm install @dynshift/layr@^3.3.0
  layr.yaml: layr: ^3.3.0
  then 3.3.0's code upgrade lists deprecated forms and asks before rewriting them

Upgrade to LAYR 3.3.0? [y/N]
```

**Your code.** Then the newly installed version checks the code. When LAYR renames something, the old form keeps compiling until the next major version and the compiler marks each use (L1017). The upgrade lists them with the new form and asks before it changes anything:

```text
A Widget renders `.wgt(...)` (since 3.2.0; the old form goes in 4.0.0)
  Widget(.name(Card) .obj(Container()))
  Widget(.name(Card) .wgt(Container()))
  src/widgets/card.layr:3

Apply 1 change(s) in 1 file(s)? [y/N]
```

It rewrites and formats only the files it lists. `layr upgrade --code` runs this step alone, with the version installed now. `layr dev` mentions deprecated forms when it starts, and the VS Code extension offers **Update all**. `layr format` never applies them on its own.

`layr upgrade --check` reports both steps without changing anything and exits with 1 when something is behind, for CI. A project on 3.2 or older upgrades with `npx @dynshift/layr@latest upgrade`, because its own `layr upgrade` only knew the code step.

## layr.yaml

```yaml
name: my-app
layr: ^3.0.0
addons:
  google_fonts: ^1.0.0
base: /
access:
  force: ["src/system/**"]   # files allowed to use Inject(.force ...)
targets: [react]
```
