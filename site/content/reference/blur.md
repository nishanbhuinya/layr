## Frosted glass

Blur blurs what shows through it from behind (`blurOn: background`, the default) or its own content (`blurOn: object`). Its `color` is a veil over the blur; keep it translucent so the blur shows. The [Effects guide](/docs/effects) covers progressive blur, edges and curves.

```layr
Stack(
  .config(w: 320, h: 190, clip: true, cornerRadius: 16)
  Container(
    .config(
      w: fill
      h: fill
      color: LinearGradient(.colors(ember, violet, teal))
    )
  )
  Position(
    .config(left: 20, top: 20)
    .obj(Container(.config(size: 70, color: gold, cornerRadius: 999)))
  )
  Position(
    .config(bottom: 56, left: 36, right: 36, top: 56)
    .obj(
      Blur(
        .config(
          w: fill
          h: fill
          color: panel.alpha(40%)
          cornerRadius: 12
          value: 18
        )
        .obj(
          Mid(Text(.config(color: ink, weight: semibold) .obj('Frosted glass')))
        )
      )
    )
  )
)
```

> **Try it**
> - Change `value: 18` to `value: 4`, then to `40`.
> - Change `panel.alpha(40%)` to `panel.alpha(85%)`: more veil, less of what is behind.

## A progressive fade

`type: progressive` is clear at one side and strongest at `edge`, so content dissolves instead of stopping at a line.

```layr
Stack(
  .config(w: 320, h: 170, clip: true, cornerRadius: 16)
  Column(
    .config(w: fill, gap: 8, padding: all(14))
    Text('Mixing session · Tue 10:30')
    Text('Podcast recording · Thu 14:30')
    Text('Band rehearsal · Fri 09:00')
    Text('Voice-over · Sat 11:00')
    Text('Drum tracking · Sun 16:00')
  )
  Position(
    .config(bottom: 0, left: 0, right: 0)
    .obj(
      Blur(
        .config(
          w: fill
          h: 90
          edge: bottom
          fade: canvas
          type: progressive
          value: 12
        )
      )
    )
  )
)
```

> **Try it**
> - Change `edge: bottom` to `edge: top` and pin the Position to `top: 0` instead of `bottom: 0`.
