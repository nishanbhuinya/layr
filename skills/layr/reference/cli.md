---
title: CLI
description: Every layr command.
order: 42
---

# CLI

`layr` comes with `@dynshift/layr`. Run it with `npx layr` inside a project, or install it globally with `npm i -g @dynshift/layr`.

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
| `layr upgrade` | List deprecated forms, then rewrite them once you agree (`--check` for CI, `--yes` to agree in advance) |
| `layr test` | Screenshot every route at every design frame and compare (`--update`, `--frames m,w`) |
| `layr add <addon>` | Install addons |
| `layr remove <addon>` | Uninstall addons |
| `layr update [addon]` | Update addons |
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

## Upgrading your code

When LAYR renames something, the old form keeps compiling until the next major version, and the compiler marks each use (L1017). `layr upgrade` lists them with the new form and asks before it changes anything:

```text
$ layr upgrade
A Widget renders `.wgt(...)` (since 3.2.0; the old form goes in 4.0.0)
  Widget(.name(Card) .obj(Container()))
  Widget(.name(Card) .wgt(Container()))
  src/widgets/card.layr:3

Apply 1 change(s) in 1 file(s)? [y/N]
```

It rewrites and formats only the files it lists. `layr dev` mentions deprecated forms when it starts, and the VS Code extension offers **Update all**. `layr format` never applies them on its own.

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
