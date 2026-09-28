## A toolbar

A Row lays its objects out left to right with a `gap`. `xAlign` distributes them along the row, `yAlign` aligns them across it, and `align` sets both at once.

```layr
Row(
  .config(
    w: fill
    color: panel
    cornerRadius: 12
    gap: 12
    padding: all(14)
    xAlign: between
    yAlign: mid
  )
  Text(.config(size: 15, weight: semibold) .obj('Inbox'))
  Row(
    .config(gap: 8)
    Container(
      .config(color: sunken, cornerRadius: 999, padding: sym(x: 10, y: 4))
      .obj(Text(.config(size: 12, color: muted) .obj('12 new')))
    )
    Container(
      .config(color: accent, cornerRadius: 999, padding: sym(x: 10, y: 4))
      .obj(Text(.config(size: 12, color: onAccent) .obj('Compose')))
    )
  )
)
```

> **Try it**
> - Change `xAlign: between` to `xAlign: start`, then `end`.

## When space runs out

A row of `fill` objects stacks into a column when one of them would be squeezed below a comfortable width, and a row of fixed or hugging objects wraps. Nothing to write: switch the preview to `m` to see it.

```layr
Row(
  .config(w: fill, gap: 12)
  Container(.config(w: fill, h: 64, minW: 220, color: violet, cornerRadius: 12))
  Container(.config(w: fill, h: 64, minW: 220, color: teal, cornerRadius: 12))
)
```

> **Try it**
> - Add `stackAt: 900` to the Row's config: it stacks below that width, even at `w`.
