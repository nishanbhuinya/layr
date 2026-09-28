## A card

A Container draws one box around one object: its size, paint, border, corners, shadow and padding. Most cards, tiles, chips and panels are a Container.

```layr
Container(
  .config(
    w: 280
    .border(color: line, width: 1)
    color: panel
    cornerRadius: 14
    padding: all(18)
    shadow: shadow(y: 8, blur: 24, color: black.alpha(12%))
  )
  .obj(
    Column(
      .config(gap: 6)
      Text(.config(size: 13, color: muted) .obj('Order 1042'))
      Text(.config(size: 18, weight: semibold) .obj('Two items, ships Monday'))
    )
  )
)
```

> **Try it**
> - Change `cornerRadius: 14` to `cornerRadius: 999`: the card becomes a pill.
> - Change `padding: all(18)` to `padding: sym(x: 28, y: 10)`.

## Placing its object

`objAlign` (also written `align`) places the object inside a box that is larger than it.

```layr
Container(
  .config(
    w: 280
    h: 120
    color: sunken
    cornerRadius: 12
    objAlign: bottomRight
    padding: all(12)
  )
  .obj(Text(.config(size: 13, color: muted) .obj('bottom right')))
)
```

> **Try it**
> - Change `bottomRight` to `mid`, then to `topLeft`.
