## Cutting to a shape

Clip cuts its object to a `shape`: `rect` (with the Clip's `cornerRadius`), `circle` or `ellipse`. Anything outside the shape is not drawn.

```layr
Row(
  .config(gap: 20, yAlign: mid)
  Clip(
    .config(size: 110, shape: circle)
    .obj(
      Container(
        .config(w: 110, h: 110, color: LinearGradient(.colors(violet, teal)))
      )
    )
  )
  Clip(
    .config(w: 170, h: 110, shape: ellipse)
    .obj(
      Container(
        .config(w: 170, h: 110, color: LinearGradient(.colors(ember, gold)))
      )
    )
  )
  Clip(
    .config(size: 110, cornerRadius: 28, shape: rect)
    .obj(
      Container(
        .config(w: 110, h: 110, color: LinearGradient(.colors(teal, gold)))
      )
    )
  )
)
```

> **Try it**
> - Change the last Clip's `cornerRadius: 28` to `cornerRadius: 6`.
> - Change the ellipse's `w: 170` to `w: 110`: an ellipse in a square box is a circle.

For pictures, `Image` has `cornerRadius` of its own; Clip is for any object, whatever it contains.
