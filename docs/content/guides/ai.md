---
title: AI agents
description: The LAYR Skill, the MCP server and llms.txt, so coding agents write real LAYR.
order: 45
---

# AI agents

LAYR is designed to be written by people and by AI agents. Agents know React and Flutter well, and those instincts produce wrong LAYR. Agents write good LAYR when they have three things: the rules of the language, exact references for every widget and diagnostic, and a way to check their work. LAYR ships all three, matched to the version your project installs.

## The LAYR Skill

```sh
layr skills install
```

The Skill is a folder of Markdown in the Agent Skills format: `SKILL.md` with the mental model, the canonical form and the mistakes agents usually make, plus references for every widget, key and diagnostic, generated from the same schema as this site. `layr skills install` does three things:

- copies the Skill into `.claude/skills/layr/` (for Claude Code), in the version of the project's installed `@dynshift/layr`;
- adds a short section to `AGENTS.md` that points other agents at it;
- adds the LAYR MCP server to `.mcp.json`, keeping any servers already there.

`layr skills update` refreshes it, and `layr upgrade` does so for you when it moves the project to a newer LAYR. `layr skills path` prints where the installed package keeps it.

## The workflow agents follow

1. Write the file.
2. `layr format` rewrites it in canonical form.
3. `layr analyze --json` lists every diagnostic. Fix each one, with `layr explain <code>` when a message is not enough, until it is clean.

LAYR's diagnostics are precise enough for an agent to correct itself, so it checks its own work the way you would.

## The MCP server

`layr mcp` starts a Model Context Protocol server over stdio. Its tools are `list_widgets`, `get_widget`, `explain_error`, `check_snippet`, `format`, `analyze_project` and `search_addons`. `layr skills install` registers it in `.mcp.json`; to add it to an agent by hand, for example Claude Code:

```sh
claude mcp add layr -- npx -y @dynshift/layr mcp
```

On Windows, start it through `cmd`: `claude mcp add layr -- cmd /c npx -y @dynshift/layr mcp`.

## Always the scoped name

Agents run commands through `npx`, so the Skill, `AGENTS.md` and `.mcp.json` all write `npx @dynshift/layr <command>`. Inside a project, that runs the project's installed version. The unscoped `npx layr` is not LAYR: outside a project it fetches an unrelated npm package called `layr`.

## llms.txt

[/llms.txt](/llms.txt) indexes these docs for agents that read the web, and [/llms-full.txt](/llms-full.txt) is the whole documentation in one file. Every docs page is also available as Markdown at its URL plus `.md`.
