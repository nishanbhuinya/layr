## A hole cut out

Subtract cuts the upper layers' shapes out of the base layer, the one with the lowest `Order`. What was cut shows whatever is behind.

```layr
Subtract(
  Order(
    .posOrder(0)
    .obj(Container(.config(size: 160, color: accent, cornerRadius: 80)))
  )
  Order(
    .posOrder(1)
    .obj(
      Position(
        .config(bottom: 18, right: 18)
        .obj(Container(.config(size: 56, cornerRadius: 28)))
      )
    )
  )
)
```

> **Try it**
> - Change the hole's `size: 56` to `size: 90`, with `cornerRadius: 45`.
> - Change the hole's `bottom: 18, right: 18` to `top: 18, left: 18`.

## What is left outside the cut

The base keeps everything the cut does not cover, even where it reaches outside the others. Here the base is the teal circle, pushed below the square by `bottom: -40`; the square cuts it away except for the part that hangs out underneath.

```layr
Subtract(
  Order(.posOrder(1) .obj(Container(.config(size: 140, color: ember))))
  Order(
    .posOrder(0)
    .obj(
      Position(
        .config(bottom: -40)
        .obj(Container(.config(size: 90, color: teal, cornerRadius: 45)))
      )
    )
  )
)
```

> **Try it**
> - Change `bottom: -40` to `bottom: -70`: more of the circle hangs out.
> - Swap the two `.posOrder` values: now the circle is cut out of the square.
