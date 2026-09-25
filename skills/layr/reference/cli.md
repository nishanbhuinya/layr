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
