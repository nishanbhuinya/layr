## A value on a range

Slider picks a number between `min` and `max` in steps of `step`. `.fnc { … }` runs with the new `value` while it is dragged, so what depends on it follows the thumb.

```layr
Page(
  .name(Hours)
  .route('/')
  var int hours = 2
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(w: 320, gap: 12, padding: all(24))
        Slider(
          .config(label: 'Hours', max: 8, min: 1, step: 1, value: hours)
          .fnc { hours = value }
        )
        Text(
          .config(size: 18, weight: semibold)
          .obj('$hours hours · €${hours * 24}')
        )
        Container(
          .config(w: hours * 40, h: 10, color: accent, cornerRadius: 999)
        )
      )
    )
  )
)
```

> **Try it**
> - Drag the thumb: the price and the bar follow.
> - Change `step: 1` to `step: 2`.
