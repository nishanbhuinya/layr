## Colour filters

Filter changes how its object looks without changing the object: `grayscale`, `sepia`, `invert` and `saturate` take `0` to `1` (or more), `brightness` and `contrast` take `1` for unchanged, `hueRotate` an angle, and `blur` a length. Several combine.

```layr
Row(
  .config(gap: 12)
  Container(
    .config(
      w: 140
      h: 90
      color: LinearGradient(.colors(ember, gold, teal))
      cornerRadius: 12
    )
  )
  Filter(
    .config(grayscale: 1)
    .obj(
      Container(
        .config(
          w: 140
          h: 90
          color: LinearGradient(.colors(ember, gold, teal))
          cornerRadius: 12
        )
      )
    )
  )
  Filter(
    .config(hueRotate: 140deg)
    .obj(
      Container(
        .config(
          w: 140
          h: 90
          color: LinearGradient(.colors(ember, gold, teal))
          cornerRadius: 12
        )
      )
    )
  )
)
```

> **Try it**
> - Change `grayscale: 1` to `sepia: 1`.
> - Change `hueRotate: 140deg` to `hueRotate: 260deg`.
> - Add `blur: 6` next to the grayscale.

## Blending with what is behind

`blend` mixes the object with what is under it: `multiply` darkens, `screen` lightens, `difference` inverts where they overlap. The circles sit on a white card so the blend reads the same in every theme.

```layr
Stack(
  .config(w: 260, h: 160, color: white, cornerRadius: 14, padding: all(20))
  Container(.config(size: 120, color: teal, cornerRadius: 999))
  Position(
    .config(left: 100, top: 20)
    .obj(
      Filter(
        .config(blend: multiply)
        .obj(Container(.config(size: 120, color: ember, cornerRadius: 999)))
      )
    )
  )
)
```

> **Try it**
> - Change `blend: multiply` to `blend: difference`.
