## A badge on a corner

Inside a Stack, Position pins its object to edges (`top`, `right`, `bottom`, `left`) or offsets it by `x`/`y`. Negative values are allowed: here the badge hangs over the corner.

```layr
Stack(
  .config(w: 240, h: 140)
  Container(
    .config(
      w: fill
      h: fill
      .border(color: line, width: 1)
      color: panel
      cornerRadius: 14
    )
    .obj(Mid(Text(.config(color: muted) .obj('Messages'))))
  )
  Position(
    .config(right: -8, top: -8)
    .obj(
      Container(
        .config(size: 28, color: accent, cornerRadius: 999, objAlign: mid)
        .obj(
          Text(.config(size: 13, color: onAccent, weight: semibold) .obj('3'))
        )
      )
    )
  )
)
```

> **Try it**
> - Change `right: -8, top: -8` to `bottom: 12, left: 12`.

## Stretching between edges

Pinning two opposite edges stretches the object between them.

```layr
Stack(
  .config(w: 280, h: 120, color: sunken, cornerRadius: 12)
  Position(
    .config(bottom: 16, left: 16, right: 16)
    .obj(Container(.config(w: fill, h: 36, color: accent, cornerRadius: 8)))
  )
)
```

> **Try it**
> - Change `right: 16` to `right: 140`: the bar now ends 140 from the right edge.
