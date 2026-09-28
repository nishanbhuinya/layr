## A gallery that fits its width

Grid places objects in columns. With `minItemW`, it fits as many columns as that width allows, so the same grid shows one column on a phone and four on a wide screen. `cols` (also written `columns`) fixes the count instead.

```layr
Grid(
  .config(w: fill, gap: 10, minItemW: 140)
  Container(.config(w: fill, h: 90, color: violet, cornerRadius: 12))
  Container(.config(w: fill, h: 90, color: teal, cornerRadius: 12))
  Container(.config(w: fill, h: 90, color: gold, cornerRadius: 12))
  Container(.config(w: fill, h: 90, color: ember, cornerRadius: 12))
  Container(.config(w: fill, h: 90, color: accent, cornerRadius: 12))
  Container(.config(w: fill, h: 90, color: sunken, cornerRadius: 12))
)
```

> **Try it**
> - Switch the preview between `m` and `w`: the column count follows the width.
> - Replace `minItemW: 140` with `cols: 2`.
