---
title: AI agents
description: The LAYR Skill, the MCP server and llms.txt, so agents write real LAYR.
order: 45
---

# AI agents

LAYR is designed to be written by people and by AI agents. Agents know React and Flutter well, and those instincts produce wrong LAYR. Three things fix that.

## The LAYR Skill

```sh
npx layr skills install
```

This writes the LAYR Skill to `.claude/skills/layr/` (for Claude Code) and a short section to `AGENTS.md` (for other agents). The Skill carries the language rules, the canonical form, every widget and key, the diagnostics, patterns and the mistakes agents usually make, and matches your installed LAYR version. `layr skills update` refreshes it after upgrading LAYR.

The Skill tells agents to work in a loop: write, `layr format`, `layr analyze --json`, fix until clean. LAYR's diagnostics are precise enough for agents to correct themselves.

## The MCP server

```sh
npx layr mcp
```

An MCP server over stdio with tools to list widgets, get a widget's full schema, explain a diagnostic, check a snippet, format code, analyze the project and search addons. Register it in your agent, for example in Claude Code:

```sh
claude mcp add layr -- npx layr mcp
```

## llms.txt

[layr.dynshift.com/llms.txt](/llms.txt) indexes the docs for agents that read the web; `/llms-full.txt` is the whole documentation in one file.
