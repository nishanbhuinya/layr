---
title: Pages and the app
description: Pages, routes, metadata, data loading, navigation, the App, themes.
order: 30
---

# Pages and the app

An app is a set of **Pages**, each at its own address, plus one **App** file that configures all of them.

## Pages and navigation

Here are two pages that link to each other. The result is a small app: click the links.

```layr
Page(
  .name(Home)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 12, padding: all(24))
      Text(.config(size: 28, type: h1) .obj('Home'))
      Link(.config(label: 'Read about us', to: About))
      Button(
        .preset(default)
        .config(label: 'Open post 3')
        .fnc(.go(Post, id: 3))
      )
    ))
  )
)

Page(
  .name(About)
  .route('/about')
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 12, padding: all(24))
      Text(.config(size: 28, type: h1) .obj('About'))
      Link(.config(label: '← Home', to: Home))
    ))
  )
)

Page(
  .name(Post)
  .route('/posts/:id')
  .meta(title: 'A post')
  .load { return { title: 'Post number ' + route.id } }
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 12, padding: all(24))
      Text(.config(size: 28, type: h1) .obj('${data?.title ?? "Loading"}'))
      Link(.config(label: '← Home', to: Home))
    ))
  )
)
```

- **`Link(.config(to: About))`** navigates inside the app without reloading. `to:` takes a Page, so a renamed or deleted page is a compile error, never a dead link.
- **`.go(Post, id: 3)`** navigates from an action, filling the route's `:id`.
- **`route`** holds the route params (`route.id`) and query values.
- **`.load { }`** runs when the page is visited; what it returns is `data`, and the page renders again when it arrives.
- **`.meta(title: ...)`** sets the document title; `layr build` writes it into each prerendered page.

> **Try it**
> - Change `.go(Post, id: 3)` to `id: 42`, run, and press the button.
> - Add a third Link on Home: `Link(.config(label: 'Post 7', href: '/posts/7'))`. `href` is a plain address, for links outside the app's pages.

Routes come from file paths unless a page sets `.route(...)`: `src/pages/index.layr` is `/`, `src/pages/about.layr` is `/about`, `src/pages/docs/intro.layr` is `/docs/intro`, and `src/pages/posts/[id].layr` is `/posts/:id`.

## Scaffold

`Scaffold` is the page's viewport box: at least the screen's height, safe areas respected. Its slots are `.bar(...)` (a sticky header), `.body(...)` and `.footer(...)`, shown on the [Objects](/docs/objects#slots-where-children-go) page. `scroll: none` makes a fixed, app-like screen that uses the `contain` [Design Scale fit](/docs/design-scale).

## The App

`src/app.layr` configures the whole app: its [Design Scale](/docs/design-scale) frames, its theme and its React providers.

```layr
App(
  .scale(DesignScale(
    .m(w: 390, h: 844)
    .t(w: 834, h: 1194)
    .w(w: 1440, h: 900)
    .uw(w: 2560, h: 1080)
  ))
  .theme(Theme(
    .colors(canvas: #f4efe7, panel: #fffcf7, ink: #1c1917, accent: #c93f12)
    .dark(canvas: #121110, panel: #1a1816, ink: #f3ede6, accent: #ff6a3d)
    .font(body: 'Inter')
  ))
)
```

Theme colours become names you can use anywhere (`color: accent`, `ink.alpha(70%)`), and CSS variables (`--layr-color-accent`) for React components. `.dark(...)` gives the dark-mode values; they follow the reader's system setting. `.font(body: ...)` sets the app font.

The examples on this site all run in this site's own theme, which is why they can say `color: panel` and change with the theme you pick at the top of the page.
