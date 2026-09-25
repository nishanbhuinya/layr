# Changelog

All notable changes to `@dynshift/layr`. The format follows [Keep a Changelog](https://keepachangelog.com), and the project uses semantic versioning.

## 3.0.0

LAYR 3: a compiled UI language, replacing the 1.x React component library. `npm install @dynshift/layr` now installs LAYR 3; LAYR 1.x stays installable as `@dynshift/layr@v1`.

### Added

- The `.layr` language: objects, config, slots, ids, presets, per-frame config, conditions and lists, state (`var`, `const`, `bind`), functions as SAPI steps or TypeScript, arrow functions, one canonical form.
- The compiler to static CSS and React, with diagnostics for every problem and `layr explain`.
- Design Scale: design frames (m, t, w, uw and custom), ds units, interpolation between frames, subtree scaling, viewport units.
- Deterministic layout: fixed, hug and fill sizing; automatic wrap and stack; `Adapt`; sticky positioning; scroll edge fades.
- Export, Extract and Inject with ordered, reversible layers and `!mut`. What an object shows is a feature too: a Text's content, a slot's objects (`obj`, `objs`, named slots), a widget instance's params and `obj`, and a React component's props. Objects written as values (`card.obj = Text('Hi')`) compile like layout objects.
- JSX inside LAYR (`.obj(<div/>)`) and LAYR inside JSX.
- Buttons answer a press: a small scale on press and a brighten on hover, with none under reduced motion.
- Animate with springs and enter and exit motion.
- Themes with light and dark colours as CSS variables.
- React interop in both directions; `@dynshift/layr/tsx` components.
- The `layr` CLI: create, dev, build with prerendering (including dynamic routes), preview, format, analyze, explain, test, addons, skills, lsp, mcp.
- The language server, the VS Code extension, the LAYR Skill and the MCP server.
- Official addon: google_fonts.

LAYR 1.x continues on the `v1` branch; `npm install @dynshift/layr@v1` installs it.
