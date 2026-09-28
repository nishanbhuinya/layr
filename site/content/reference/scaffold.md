## A page with a bar, a body and a footer

Scaffold is the page's frame: full height, the safe areas, the scroll policy and the three places a page is made of. `.bar` stays at the top while the page scrolls, `.body` is the content, and `.footer` sits at the end. `textColor` is the colour every Text uses unless it sets its own.

```layr
Page(
  .name(Home)
  .route('/')
  Scaffold(
    .config(color: canvas, textColor: ink)
    .bar(
      Row(
        .config(
          w: fill
          .border(color: line, width: 1, sides: bottom)
          color: panel
          padding: sym(x: 20, y: 14)
          xAlign: between
          yAlign: mid
        )
        Text(.config(weight: semibold) .obj('Studio'))
        Text(.config(color: muted) .obj('Sign in'))
      )
    )
    .body(
      Column(
        .config(w: fill, gap: 12, padding: all(20))
        Text(.config(size: 28, type: h1, weight: semibold) .obj('Book a room'))
        Text(
          .config(color: muted)
          .obj(
            'The bar is sticky: on a long page it stays on top as you scroll.'
          )
        )
        Container(.config(w: fill, h: 180, color: panel, cornerRadius: 14))
        Container(.config(w: fill, h: 180, color: panel, cornerRadius: 14))
      )
    )
    .footer(
      Container(
        .config(w: fill, padding: all(20))
        .obj(Text(.config(size: 13, color: faint) .obj('© Studio')))
      )
    )
  )
)
```

> **Try it**
> - Change `textColor: ink` to `textColor: accent`: every Text without its own colour follows.
> - Remove the whole `.footer(...)`: the page ends after the body.
