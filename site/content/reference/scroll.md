## A horizontal shelf

Scroll lets its object scroll along an `axis` (`y` by default, `x`, or `both`). `snap` stops items at a position, and `fade` softens the edges where content goes out of view.

```layr
Scroll(
  .config(w: fill, axis: x, fade: 24, snap: start)
  .obj(
    Row(
      .config(gap: 12, padding: sym(y: 4))
      Container(.config(w: 180, h: 110, color: violet, cornerRadius: 14))
      Container(.config(w: 180, h: 110, color: teal, cornerRadius: 14))
      Container(.config(w: 180, h: 110, color: gold, cornerRadius: 14))
      Container(.config(w: 180, h: 110, color: ember, cornerRadius: 14))
      Container(.config(w: 180, h: 110, color: accent, cornerRadius: 14))
    )
  )
)
```

> **Try it**
> - Scroll the shelf sideways: each card snaps to the start.
> - Change `fade: 24` to `fade: 0`: the edges cut hard.

## A list with a fixed height

```layr
Scroll(
  .config(
    w: 280
    h: 160
    .border(color: line, width: 1)
    color: panel
    cornerRadius: 12
  )
  .obj(
    Column(
      .config(w: fill, gap: 2, padding: all(6))
      Container(.config(w: fill, padding: all(10)) .obj(Text('Monday')))
      Container(.config(w: fill, padding: all(10)) .obj(Text('Tuesday')))
      Container(.config(w: fill, padding: all(10)) .obj(Text('Wednesday')))
      Container(.config(w: fill, padding: all(10)) .obj(Text('Thursday')))
      Container(.config(w: fill, padding: all(10)) .obj(Text('Friday')))
    )
  )
)
```
