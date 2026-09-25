---
title: React interop
description: Use React packages in LAYR, and LAYR in React apps.
order: 35
---

# React interop

LAYR's first render target is React, so the React ecosystem is one explicit, typed boundary away.

## JSX inside LAYR

Write JSX wherever LAYR expects an object: an HTML element or a React component, with LAYR objects inside it or around it. Lowercase tags are HTML elements, capitalised tags are React components you import, attributes are `"strings"` or `{ TypeScript }`, and `{ }` in the children is a TypeScript expression.

```layr
Page(
  .name(Mixed)
  .route('/')
  var int likes = 3
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(w: fill, gap: 16, padding: all(24))
      <section className="note" style={{ borderLeft: '3px solid var(--layr-color-accent)', paddingLeft: 12 }}>
        Text(.config(size: 18, weight: semibold, color: ink) .obj('A LAYR Text inside a section'))
        <p style={{ margin: 0, color: 'var(--layr-color-muted)' }}>Plain HTML, {likes} likes.</p>
      </section>
      Container(
        .config(
          .border(color: line, width: 1)
          color: panel
          cornerRadius: 12
          padding: all(16)
        )
        .obj(<button onClick={() => likes++}>Like it</button>)
      )
    ))
  )
)
```

That is the whole bridge to the React ecosystem: a component library's `<Dialog>`, a chart's `<LineChart>`, or `<motion.div>` go in the tree as they are, and LAYR objects inside them keep their layout, Design Scale and E/E/I. A LAYR object inside an element is reachable through it: the `Text` above is `Mixed.scaffold.body.column.section.text`.

JSX text follows React's rules: line breaks and the spaces around them collapse. A word followed directly by `(` inside JSX text (`Container(`) is read as a LAYR object; write `{'Container('}` for the text. `layr format` leaves JSX exactly as you wrote it.

## React components as LAYR objects

Import a React component and use it as an object. `.props(...)` passes props to it; `.config(...)` takes only LAYR layout keys, applied to a box around it; `.on(change: ...)` maps to `onChange`:

```layr
import { Counter } from '../react/Counter.tsx'

Page(
  .name(Interop)
  var int changes = 0
  Scaffold(
    .body(Column(
      .config(gap: 12, padding: all(24))
      Counter(
        .config(padding: all(8))
        .props(start: 5, label: 'React counter')
        .on(change: { changes++ })
      )
      Text('changes seen by LAYR: $changes')
    ))
  )
)
```

Named slots become ReactNode props: `.slot(icon: Icon('star'))`.

## Hooks

React hooks run inside a `.react { }` block on a Page or Widget. Its variables are in scope for the whole definition:

```layr noexec
import { useQuery } from '@tanstack/react-query'

Page(
  .name(Stats)
  .react { const stats = useQuery({ queryKey: ['stats'], queryFn: getStats }) }
  Scaffold(.body(Text('Visitors: ${stats.data?.visitors ?? "…"}')))
)
```

Calling a hook anywhere else is an error (L9002).

## Providers

```layr noexec
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

App(.providers(QueryClientProvider(.props(client: new QueryClient()))))
```

## Styling React components

Theme colours and the design unit are CSS variables inside a LAYR app: `var(--layr-color-brand)`, and `calc(200 * var(--ds) / 1000)` for 200 design px. Pass classes with `.props(className: '...')`.

## LAYR in React apps

Add the Vite plugin and import `.layr` files as React components:

```ts
// vite.config.ts
import layr from "@dynshift/layr/vite";
export default { plugins: [layr()] };
```

```tsx
import "@dynshift/layr/styles.css";
import { LayrProvider } from "@dynshift/layr/react";
import Card from "./card.layr";

export function App() {
  return (
    <LayrProvider>
      <Card title="Hello" />
    </LayrProvider>
  );
}
```

Params become props; the widget's `.obj` is `children`.

## Core widgets as TSX

For code that is not ready for `.layr`, the core widgets are also React components with LAYR units:

```tsx
import "@dynshift/layr/styles.css";
import { Container, LayrProvider, Text } from "@dynshift/layr/tsx";

<LayrProvider>
  <Container w={200} h={120} color="#0d0d0d" cornerRadius={16} objAlign="mid">
    <Text color="white">Hello</Text>
  </Container>
</LayrProvider>;
```

These lower styles at runtime, so the compiler's checks, static CSS and per-frame interpolation are not available.

## Export/Extract/Inject from React

```tsx
import { inject, useExtract } from "@dynshift/layr/react";

const size = useExtract("Target::card", "size");
const remove = inject("Target::card", "color", 0, () => "#ef4444");
```

Objects you address from React need an `.id`.
