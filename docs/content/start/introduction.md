---
title: What is LAYR
description: LAYR is a compiled UI language for the web. Layout Authoritative Yet Responsive.
order: 1
---

# What is LAYR

LAYR (**L**ayout **A**uthoritative **Y**et **R**esponsive) is a language for the layout of web pages. You write what the page *is*, objects inside objects, measured in your design's numbers. The compiler turns that into static CSS and a React component, and checks it before anything runs.

Here is a whole LAYR page. The result is live, and the code under it is editable: change something and press **Run** (or <kbd>Ctrl</kbd> <kbd>S</kbd>).

```layr
Page(
  .name(Profile)
  .route('/')

  var int likes = 0

  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(w: fill, padding: all(32), xAlign: mid)
      Row(
        .config(
          .border(color: line, width: 1)
          color: panel
          cornerRadius: 16
          gap: 16
          padding: all(20)
          yAlign: mid
        )
        Container(.config(size: 56, color: accent, cornerRadius: 999))
        Column(
          .config(gap: 2)
          Text(.config(size: 18, weight: semibold) .obj('Ada Lovelace'))
          Text(
            .config(color: muted)
            .obj('Wrote the first published program, in 1843')
          )
          Text(.config(size: 13, color: faint) .obj('$likes people like this'))
        )
        Button(.preset(default) .config(label: 'Like') .fnc { likes++ })
      )
    ))
  )
)
```

## How to read it

Read it top to bottom; the code has the shape of the page.

1. **`Page(...)`** is a page. `.name(Profile)` names it, `.route('/')` is its address.
2. **`var int likes = 0`** is state: a number the page remembers. Anything that reads it updates when it changes.
3. **`Scaffold(...)`** is the screen. `.body(...)` is one of its **slots**, the place the page's content goes.
4. **`Column` and `Row`** stack their objects down and across. Everything inside the `Row` sits side by side: a circle, three lines of text, a button.
5. **`.config(...)`** sets an object's features. `size: 56` is 56 **design pixels**: a pixel of your design, which LAYR scales to every screen ([Design Scale](/docs/design-scale)).
6. **`color: panel`** is a colour from the theme. The examples on this site use its theme, so they follow the one you pick at the top of the page.
7. **`.fnc { likes++ }`** runs when the button is pressed. Round brackets hold LAYR; curly braces hold TypeScript.

> **Try it**
> - Change `gap: 16` to `gap: 40` and run: the space between the three parts grows.
> - Change `cornerRadius: 999` to `cornerRadius: 8`: the circle becomes a rounded square.
> - Press **m** in the result bar (a 390px phone), or drag the corner narrower. When the text would be squeezed, the row stacks into a column by itself. Nothing in the code asks for that: it is LAYR's [adaptation](/docs/layout#when-space-runs-out).

## Why a language

Web layout is usually a negotiation between CSS units, breakpoints, framework conventions and component libraries. LAYR makes the layout the program:

- **The code's shape is the UI's shape.** Objects nest the way they appear. Logic stays in `.config`, `.fnc` and `{ }` blocks.
- **Design units, not CSS units.** Numbers come from your design frame, and [Design Scale](/docs/design-scale) fits them to every screen without media queries.
- **Deterministic layout.** Every feature resolves in one documented order, and overflow adapts by fixed rules that `layr analyze` can explain.
- **Reachable from anywhere.** [Export, Extract and Inject](/docs/export-extract-inject) let any part of an app read and change any object, as ordered layers the compiler checks.
- **One canonical form.** `layr format` writes every file the same way, so code reads the same everywhere and AI agents write it correctly.

## What you get

| Piece | What it does |
|---|---|
| The language | `.layr` files: Pages, Widgets, Functions, state, layout |
| The compiler | Checks names, types, layout and Export/Extract/Inject before anything runs; emits CSS and React |
| The runtime | Signals, the injection cascade, measurement, animation, routing |
| The CLI | `layr create`, `dev`, `build`, `format`, `analyze`, `test`, `add` and more |
| Tooling | A VS Code extension, a language server, an MCP server and the LAYR Skill for AI agents |

## How it fits with React

LAYR compiles to React components, so a LAYR app can use any React package (even as JSX, right in the tree) and a React app can import `.layr` files. React is the engine underneath, not the way you write LAYR. See [React interop](/docs/react).

Next: [Quick start](/docs/quick-start), or [the syntax](/docs/syntax) if you want to read more LAYR first.
