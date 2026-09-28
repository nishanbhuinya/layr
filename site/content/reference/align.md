## Placing at an edge or corner

Align fills its parent and places its object at an alignment: `topLeft`, `topMid`, `topRight`, `midLeft`, `mid`, `midRight`, `bottomLeft`, `bottomMid` or `bottomRight`. `to` is also written `align` or `alignment`.

```layr
Container(
  .config(
    w: 280
    h: 140
    .border(color: line, width: 1)
    color: panel
    cornerRadius: 14
    padding: all(14)
  )
  .obj(
    Align(
      .config(to: bottomRight)
      .obj(
        Container(
          .config(color: accent, cornerRadius: 8, padding: sym(x: 12, y: 6))
          .obj(Text(.config(size: 13, color: onAccent) .obj('Continue')))
        )
      )
    )
  )
)
```

> **Try it**
> - Change `to: bottomRight` to `to: topMid`.
> - Short forms work too: `to: bR` is `bottomRight`, and `layr format` writes it out.
