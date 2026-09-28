## To a page, or away

Link navigates. `to` names a Page of your app (it opens without a reload), `href` a URL; `external: true` opens it in a new tab. A Link holds text (`label`) or any object, so a whole card can be a link.

```layr
Page(
  .name(Home)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(gap: 14, padding: all(24))
        Link(.config(label: 'Read about the studio', to: About))
        Link(
          .config(
            external: true
            href: 'https://github.com/nishanbhuinya/layr'
            label: 'LAYR on GitHub'
          )
        )
        Link(
          .config(to: About, underline: false)
          .obj(
            Container(
              .config(
                w: 280
                .border(color: line, width: 1)
                color: panel
                cornerRadius: 12
                padding: all(16)
              )
              .obj(
                Column(
                  .config(gap: 4)
                  Text(.config(weight: semibold) .obj('Room B'))
                  Text(
                    .config(size: 13, color: muted)
                    .obj('The whole card is the link.')
                  )
                )
              )
            )
          )
        )
      )
    )
  )
)

Page(
  .name(About)
  .route('/about')
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(gap: 12, padding: all(24))
        Text('About the studio')
        Link(.config(label: '← Back', to: Home))
      )
    )
  )
)
```

> **Try it**
> - Click the card, then **← Back**: the pages change without reloading.
