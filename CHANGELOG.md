# Changelog

All notable changes to `@dynshift/layr`. The format follows [Keep a Changelog](https://keepachangelog.com), and the project uses semantic versioning.

## 3.0.0-next.0

LAYR 3: a compiled UI language, replacing the 1.x React component library.

### Added

- The `.layr` language: objects, config, slots, ids, presets, per-frame config, conditions and lists, state (`var`, `const`, `bind`), functions as SAPI steps or TypeScript, arrow functions, one canonical form.
- The compiler to static CSS and React, with diagnostics for every problem and `layr explain`.
- Design Scale: design frames (m, t, w, uw and custom), ds units, interpolation between frames, subtree scaling, viewport units.
- Deterministic layout: fixed, hug and fill sizing; automatic wrap and stack; `Adapt`; sticky positioning; scroll edge fades.
- Export, Extract and Inject with ordered, reversible layers and `!mut`.
- Animate with springs and enter and exit motion.
- Themes with light and dark colours as CSS variables.
- React interop in both directions; `@dynshift/layr/tsx` components.
- The `layr` CLI: create, dev, build with prerendering (including dynamic routes), preview, format, analyze, explain, test, addons, skills, lsp, mcp.
- The language server, the VS Code extension, the LAYR Skill and the MCP server.
- Official addons: kit, icons, liquid_drop.

LAYR 1.x continues on the `v1` branch and the `v1` npm dist-tag.
