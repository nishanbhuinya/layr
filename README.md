<p align="center"><img src="brand/app-icon-128.png" width="72" alt="LAYR"></p>

<h1 align="center">LAYR</h1>

<p align="center">Layout Authoritative Yet Responsive. A compiled UI language for building websites deterministically.</p>

<p align="center"><a href="https://layr.dynshift.com">Website</a> · <a href="https://layr.dynshift.com/docs">Docs</a> · <a href="https://layr.dynshift.com/playground">Playground</a> · <a href="https://layr.dynshift.com/library">Library</a></p>

---

LAYR files describe layout the way it looks. The compiler turns them into static CSS and React components, with numbers in your design's pixels that resolve the same way on every screen.

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

## Start

```bash
npm create @dynshift/layr@latest my-app
cd my-app
npm run dev
```

Or try it without installing anything in the [playground](https://layr.dynshift.com/playground).

## What is in the box

- **The language**: objects that nest the way they render, one canonical form (`layr format`), state, functions as SAPI steps or TypeScript.
- **Design Scale**: numbers are design pixels from your frames; values flow between frames and structure steps at them.
- **Deterministic layout**: fixed, hug and fill sizing; rows wrap or stack by fixed rules, and every adaptation is explainable.
- **Export, Extract, Inject**: read and change any object's features from anywhere as ordered, reversible layers the compiler checks; `!mut` protects what must never change.
- **React interop**: React packages work inside LAYR, and LAYR components work inside React apps.
- **Tooling**: the `layr` CLI, a language server and VS Code extension, the LAYR Skill and an MCP server for AI agents.

## This repository

| Path | What it is |
|---|---|
| `packages/` | the compiler, runtime, React target, CLI, language server, and `@dynshift/layr` |
| `addons/` | official addons: `kit`, `google_fonts` |
| `docs/content/` | the documentation (every snippet compiles in CI) |
| `site/` | layr.dynshift.com, built with LAYR |
| `skills/layr/` | the LAYR Skill for AI agents |
| `vscode/` | the VS Code extension |

LAYR 1.x (Flutter-style React components) lives on the [`v1` branch](https://github.com/nishanbhuinya/layr/tree/v1) and on npm as `@dynshift/layr@v1`.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT. LAYR is a [DynShift](https://dynshift.com) project; see [TRADEMARK.md](TRADEMARK.md) for the name and marks.
