# @dynshift/layr

**LAYR** (Layout Authoritative Yet Responsive) is a compiled UI language for the web. You write layout in your design's numbers; the compiler turns each `.layr` file into static CSS and a React module that resolve the same way on every screen.

```bash
npm create @dynshift/layr@latest my-app
cd my-app
npm run dev
```

```layr
Page(
  .name(Hello)
  .route('/')
  var int count = 0
  Scaffold(.body(Column(
    .config(w: fill, padding: all(24), gap: 16)
    Text(.config(type: h1) .obj('Count: $count'))
    Button(.preset(default) .config(label: 'Add one') .fnc { count++ })
  )))
)
```

This package holds the compiler, the runtime, the React target, the Vite plugin and the `layr` command (`dev`, `build`, `format`, `analyze`, `explain`, addons, the AI Skill, the language server and an MCP server).

- Documentation, playground and the addon Library: [layr.dynshift.com](https://layr.dynshift.com)
- Source and issues: [github.com/nishanbhuinya/layr](https://github.com/nishanbhuinya/layr)
- v1 (the React component library) stays available as `@dynshift/layr@v1`.

MIT © DynShift & Nishan Bhuinya
