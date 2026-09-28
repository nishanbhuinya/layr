## A 16:9 frame at any width

Aspect keeps its object at a width-to-height `ratio`, whatever width it gets. Thumbnails, video frames and maps keep their shape on every screen.

```layr
Column(
  .config(w: fill, gap: 8)
  Aspect(
    .config(ratio: 1.78)
    .obj(
      Container(
        .config(
          w: fill
          h: fill
          color: LinearGradient(.colors(ink, violet))
          cornerRadius: 14
          objAlign: mid
        )
        .obj(Text(.config(color: white) .obj('16 : 9')))
      )
    )
  )
  Text(
    .config(size: 13, color: muted)
    .obj('Resize the preview: the height follows the width.')
  )
)
```

> **Try it**
> - Change `ratio: 1.78` to `ratio: 1` for a square.
