---
title: What is LAYR
description: LAYR is a compiled UI language for the web. Layout Authoritative Yet Responsive.
order: 1
---

# What is LAYR

LAYR (**L**ayout **A**uthoritative **Y**et **R**esponsive) is a language for building user interfaces. You describe the layout; the LAYR compiler turns it into fast, accessible HTML and CSS, with React as the first render target.

```layr
Page(
  .name(Home)
  .route('/')

  var int count = 0

  Scaffold(
    .body(Mid(Column(
      .config(gap: 16, xAlign: mid)
      Text(.config(type: h1) .obj('Count: $count'))
      Button(.preset(default) .config(label: 'Add one') .fnc { count++ })
    )))
  )
)
```

## Why a language

Web layout is usually a negotiation between CSS units, breakpoints, framework conventions and component libraries. LAYR makes layout the program:

- **The code's shape is the UI's shape.** Objects nest the way they appear. Logic stays out of the way in `.config`, `.def` and `{ }` blocks.
- **Design units, not CSS units.** A number is a design pixel from your design frame (your Figma frame). LAYR handles every screen size with [Design Scale](/docs/design-scale).
- **Deterministic layout.** Every property resolves in one documented order, overflow adapts by fixed rules, and every adaptation can be explained.
- **Reachable from anywhere.** [Export, Extract and Inject](/docs/export-extract-inject) let any part of an app read and change any object's features, as reversible, ordered layers the compiler understands.
- **One canonical form.** `layr format` rewrites every file the same way, so code reads the same everywhere and AI agents write it correctly.

## What you get

| Piece | What it does |
|---|---|
| The language | `.layr` files: Pages, Widgets, Functions, state, layout |
| The compiler | Checks names, types, layout and Export/Extract/Inject before anything runs; emits CSS and React code |
| The runtime | Signals, the injection cascade, measurement, animation, routing |
| The CLI | `layr create`, `dev`, `build`, `format`, `analyze`, `test`, `add` and more |
| Tooling | A VS Code extension, a language server, an MCP server and the LAYR Skill for AI agents |

## How it fits with React

LAYR compiles to React components, so a LAYR app can use React packages and a React app can import `.layr` files. React is the engine underneath, not the way you write LAYR. See [React interop](/docs/react).

Next: [Quick start](/docs/quick-start).
