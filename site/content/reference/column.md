## A settings group

A Column lays its objects out top to bottom with a `gap`. `xAlign` aligns them across the column, `yAlign` distributes them down it, and `align` sets both.

```layr
Column(
  .config(
    w: 300
    .border(color: line, width: 1)
    color: panel
    cornerRadius: 12
    gap: 2
    padding: all(6)
  )
  Container(
    .config(w: fill, color: sunken, cornerRadius: 8, padding: all(12))
    .obj(Text('Account'))
  )
  Container(.config(w: fill, padding: all(12)) .obj(Text('Notifications')))
  Container(.config(w: fill, padding: all(12)) .obj(Text('Privacy')))
)
```

> **Try it**
> - Change `gap: 2` to `gap: 12`.

## Filling the height

Inside a Column with a height, `h: fill` shares the space that is left, like `flex: 1`.

```layr
Column(
  .config(
    w: 300
    h: 240
    color: sunken
    cornerRadius: 12
    gap: 8
    padding: all(8)
  )
  Container(.config(w: fill, h: 40, color: panel, cornerRadius: 8))
  Container(.config(w: fill, h: fill, color: accent, cornerRadius: 8))
  Container(.config(w: fill, h: 40, color: panel, cornerRadius: 8))
)
```

> **Try it**
> - Give the middle Container `h: 60`: the Column keeps its height and the rest stays empty.
> - Set the Column's `align: mid` and give every child `w: 120`: they centre.
