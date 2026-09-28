## A type scale

Text shows text. `size` is in design pixels, `weight` and `lineHeight` shape it, and `type` says what it is (`h1`–`h6`, `p`, `label`, `code`…) for screen readers and search engines, without changing how it looks.

```layr
Column(
  .config(w: 320, gap: 8)
  Text(
    .config(size: 32, letterSpacing: -0.6, type: h1, weight: semibold)
    .obj('Room B')
  )
  Text(
    .config(size: 17, color: muted, lineHeight: 1.5)
    .obj(
      'A quiet studio for mixing, podcasts and rehearsals, booked by the hour.'
    )
  )
  Text(
    .config(
      size: 12
      color: accent
      letterSpacing: 0.6
      transform: upper
      weight: medium
    )
    .obj('Available today')
  )
)
```

> **Try it**
> - Change the heading's `weight: semibold` to `weight: black`.
> - Change `transform: upper` to `transform: none`.

## Long text that must fit

`maxLines` with `overflow: ellipsis` cuts text off with `…` after that many lines, the same on every screen.

```layr
Container(
  .config(w: 260, color: panel, cornerRadius: 12, padding: all(14))
  .obj(
    Text(
      .config(lineHeight: 1.4, maxLines: 2, overflow: ellipsis)
      .obj(
        'A studio booking page that shows the week, the free times and what is coming up, written once and laid out on every screen.'
      )
    )
  )
)
```

> **Try it**
> - Change `maxLines: 2` to `maxLines: 1`.
> - Change `overflow: ellipsis` to `overflow: fade`.
