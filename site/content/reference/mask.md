## Fading a list out

Mask shows its layers only where the mask layer is opaque. The mask is the layer with the lowest `Order` (a colour, a gradient or an image), and `mode` reads it by `alpha` (the default) or by `luminance`. A gradient from solid to transparent fades whatever is above it: here the end of a list.

```layr
Mask(
  .config(w: 320, h: 200)
  Order(
    .posOrder(0)
    .obj(
      Container(
        .config(
          w: 320
          h: 200
          color: LinearGradient(.colors(black, black.alpha(0)))
        )
      )
    )
  )
  Order(
    .posOrder(1)
    .obj(
      Column(
        .config(w: 320, gap: 8)
        Container(.config(w: fill, h: 44, color: violet, cornerRadius: 10))
        Container(.config(w: fill, h: 44, color: teal, cornerRadius: 10))
        Container(.config(w: fill, h: 44, color: gold, cornerRadius: 10))
        Container(.config(w: fill, h: 44, color: ember, cornerRadius: 10))
      )
    )
  )
)
```

> **Try it**
> - Change `.colors(black, black.alpha(0))` to `.colors(black.alpha(0), black)`: it fades in instead of out.

## A shaped window onto a gradient

```layr
Mask(
  .config(w: 320, h: 90)
  Order(
    .posOrder(0)
    .obj(Container(.config(w: 320, h: 90, color: black, cornerRadius: 999)))
  )
  Order(
    .posOrder(1)
    .obj(
      Container(
        .config(
          w: 320
          h: 90
          color: LinearGradient(.colors(violet, ember, gold))
        )
      )
    )
  )
)
```

> **Try it**
> - Change the mask's `cornerRadius: 999` to `cornerRadius: 0`.
