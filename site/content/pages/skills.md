---
title: AI Skill and MCP
description: Give coding agents the LAYR rules, exact references and a language server, so they write real LAYR.
section: Reference
---

# AI Skill and MCP

Agents write good LAYR when they have three things: the rules of the language, exact references for every widget and diagnostic, and a way to check their work. LAYR ships all three.

## The LAYR Skill

The Skill is a folder of Markdown in the Agent Skills format: `SKILL.md` with the mental model, the canonical form and the mistakes agents make, plus references generated from the same schema as this site.

```bash
layr skills install
```

This copies the Skill into `.claude/skills/layr/` and adds a short block to `AGENTS.md` that points other agents at it. `layr skills update` refreshes it after you upgrade LAYR, and `layr skills path` prints where it lives. The Skill's version always matches the installed `@dynshift/layr`.

## The workflow agents follow

1. Write the file.
2. `layr format` to rewrite it in canonical form.
3. `layr analyze --json` and fix every diagnostic, using `layr explain <code>` when a message is not enough.

The Skill teaches this loop, so an agent checks its own work the same way you would.

## The MCP server

```bash
layr mcp
```

`layr mcp` starts a Model Context Protocol server over stdio. Its tools are `list_widgets`, `get_widget`, `explain_error`, `check_snippet`, `format`, `analyze_project` and `search_addons`. Add it to any MCP client with the command `layr mcp`, run in your project.

## llms.txt

[/llms.txt](/llms.txt) indexes these docs for agents that read the web, and [/llms-full.txt](/llms-full.txt) is the whole documentation in one file. Every docs page is also available as Markdown at its URL plus `.md`.
