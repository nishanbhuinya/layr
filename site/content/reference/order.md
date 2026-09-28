## Layers, like z-index

Order sets which layer its object paints on in a Stack, a Mask or a Subtract. `.posOrder(n)` takes any integer: `0` is the base, higher paints above, negatives go below, and big numbers such as `9999` put something over everything. `.pos`, `.pOrd` and `.pO` are short forms; `layr format` writes `.posOrder`.

```layr
Stack(
  .config(w: 220, h: 150)
  Order(
    .posOrder(0)
    .obj(Container(.config(size: 100, color: violet, cornerRadius: 16)))
  )
  Order(
    .posOrder(1)
    .obj(
      Position(
        .config(left: 40, top: 25)
        .obj(Container(.config(size: 100, color: teal, cornerRadius: 16)))
      )
    )
  )
  Order(
    .posOrder(2)
    .obj(
      Position(
        .config(left: 80, top: 50)
        .obj(Container(.config(size: 100, color: gold, cornerRadius: 16)))
      )
    )
  )
)
```

> **Try it**
> - Change the gold square's `.posOrder(2)` to `.posOrder(-1)`: it drops under the others.
> - Give the violet square `.posOrder(9999)`: it comes to the top.

## Choosing the base of a Subtract

In a Subtract, the lowest order is the base and the others are cut out of it, whatever the order they are written in.

```layr
Subtract(
  Order(.posOrder(1) .obj(Container(.config(size: 120, color: ember))))
  Order(
    .posOrder(0)
    .obj(
      Position(
        .config(bottom: -40)
        .obj(Container(.config(size: 80, color: teal, cornerRadius: 40)))
      )
    )
  )
)
```

> **Try it**
> - Swap the two orders: now the teal circle is cut out of the orange square.
