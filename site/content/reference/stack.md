## Text over a picture

A Stack puts its objects on top of each other: later objects paint above earlier ones. `objAlign` places objects that are smaller than the Stack, and `Position` offsets or pins one of them.

```layr
Stack(
  .config(w: 320, h: 180, clip: true, cornerRadius: 16, objAlign: bottomLeft)
  Container(
    .config(w: fill, h: fill, color: LinearGradient(.colors(violet, teal)))
  )
  Column(
    .config(gap: 2, padding: all(18))
    Text(.config(size: 12, color: white.alpha(80%)) .obj('New in LAYR'))
    Text(
      .config(size: 22, color: white, weight: semibold)
      .obj('Painted in the order you write them')
    )
  )
)
```

> **Try it**
> - Change `objAlign: bottomLeft` to `objAlign: mid`.
> - Swap the two objects: the gradient now paints over the text.

## Changing the order

`Order(.posOrder(n))` puts an object on a layer without moving it in the code, like `z-index`: any integer, higher paints above.

```layr
Stack(
  .config(w: 200, h: 140)
  Order(
    .posOrder(2)
    .obj(Container(.config(size: 90, color: ember, cornerRadius: 14)))
  )
  Position(
    .config(left: 50, top: 30)
    .obj(Container(.config(size: 90, color: teal, cornerRadius: 14)))
  )
)
```

> **Try it**
> - Change `.posOrder(2)` to `.posOrder(-1)`: the orange square goes under the teal one.
