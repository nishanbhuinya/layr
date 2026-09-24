---
title: Pages and the app
description: Pages, routes, metadata, data loading, navigation, the App, themes.
order: 30
---

# Pages and the app

## Pages

A `Page` has a name, a route (from its file path unless set), optional metadata and data loading, state, and one root object, usually a `Scaffold`:

```layr
Page(
  .name(Post)
  .route('/posts/:id')
  .meta(title: 'A post', description: 'One post')
  .load { return { title: 'Post ' + route.id } }
  Scaffold(
    .config(padding: all(24))
    .body(Column(
      Text(.config(type: h1) .obj('${data?.title ?? "Loading"}'))
      Link(.config(label: 'Back home', to: '/'))
    ))
  )
)
```

- `route` holds the route params (`route.id`) and query values.
- `.load { }` runs when the page is visited; its result is `data`.
- `.meta(title: ...)` sets the document title; `layr build` writes it into each prerendered page.

Routes from file paths: `src/pages/index.layr` → `/`, `src/pages/about.layr` → `/about`, `src/pages/docs/intro.layr` → `/docs/intro`, `src/pages/posts/[id].layr` → `/posts/:id`.

## Scaffold

`Scaffold` is the page's viewport box: at least the screen's height, safe areas respected. Slots: `.bar(...)` (sticky header), `.body(...)`, `.footer(...)`. `scroll: none` makes a fixed, app-like screen that uses the `contain` [Design Scale fit](/docs/design-scale).

## Navigation

```layr
Page(
  .name(Nav)
  Scaffold(
    .body(Row(
      .config(gap: 12)
      Link(.config(label: 'Home', to: Home))
      Link(
        .config(
          external: true
          href: 'https://layr.dynshift.com'
          label: 'Website'
        )
      )
      Button(.preset(default) .config(label: 'Go') .fnc(.go(Home)))
    ))
  )
)

Page(.name(Home) .route('/') Scaffold(.body(Text('Home'))))
```

`Link(.config(to: Page))` navigates in the app without reloading; `go(Page, id: 3)` does the same from an action.

## The App

`src/app.layr` configures the whole app: [Design Scale](/docs/design-scale) frames, theme tokens and React providers.

```layr
App(
  .scale(DesignScale(
    .m(w: 390, h: 844)
    .t(w: 834, h: 1194)
    .w(w: 1440, h: 900)
    .uw(w: 2560, h: 1080)
  ))
  .theme(Theme(.colors(brand: #ff6a3d, ink: #0d0d0d) .font(body: 'Inter')))
)
```

Theme colours become names you can use anywhere (`color: brand`, `ink.alpha(70%)`) and CSS variables (`--layr-color-brand`) for React components. `.font(body: ...)` sets the app font.
