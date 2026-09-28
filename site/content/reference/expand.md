## Taking the space that is left

Expand makes its object fill the rest of the parent's direction: the width of a Row, the height of a Column. Here a thin line fills the gap between a label and a price, the way a receipt reads.

```layr
Column(
  .config(w: 300, color: panel, cornerRadius: 12, gap: 8, padding: all(16))
  Row(
    .config(w: fill, gap: 8, yAlign: mid)
    Text('Studio, 2 hours')
    Expand(Container(.config(h: 1, color: line)))
    Text(.config(weight: semibold) .obj('€48'))
  )
  Row(
    .config(w: fill, gap: 8, yAlign: mid)
    Text('Mixing session')
    Expand(Container(.config(h: 1, color: line)))
    Text(.config(weight: semibold) .obj('€30'))
  )
)
```

> **Try it**
> - Remove one `Expand(` and its closing `)`: that row's price moves next to its label.
