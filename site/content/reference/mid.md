## Centring

Mid fills its parent and puts its object in the middle, on both axes. It is the shortest way to centre something.

```layr
Container(
  .config(w: 280, h: 140, color: sunken, cornerRadius: 14)
  .obj(
    Mid(
      Container(
        .config(
          .border(color: line, width: 1)
          color: panel
          cornerRadius: 999
          padding: sym(x: 14, y: 6)
        )
        .obj(Text(.config(size: 13) .obj('Nothing here yet')))
      )
    )
  )
)
```

> **Try it**
> - Replace `Mid(` with `Align(.config(to: bottomMid) .obj(` and add one more `)` after it: the pill moves to the bottom.
