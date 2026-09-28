## Every change moves

Animate interpolates every change to its object, whatever caused it: state, a Function, an Inject, the theme or a frame switch. By default it uses `spring.gentle`; `ease` and `duration` change that for everything, `.eases(w: spring.bouncy)` for one property.

```layr
Page(
  .name(Grow)
  .route('/')
  var bool wide = false
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(gap: 14, padding: all(24))
        Button(
          .preset(default)
          .config(label: wide ? 'Narrow' : 'Widen')
          .fnc { wide = !wide }
        )
        Animate(
          Container(
            .config(
              w: wide ? 300 : 120
              h: 60
              color: wide ? teal : accent
              cornerRadius: wide ? 30 : 12
            )
          )
        )
      )
    )
  )
)
```

> **Try it**
> - Press the button a few times, even in the middle of a move: it turns around from where it is.
> - Add `.config(ease: spring.bouncy)` to the Animate, before its object.

## Enter and exit

`.enter(...)` plays when the object appears and `.exit(...)` when it goes: `fade`, `scale` and `slide`.

```layr
Page(
  .name(Toast)
  .route('/')
  var bool shown = false
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(gap: 14, padding: all(24))
        Button(
          .preset(default)
          .config(label: shown ? 'Dismiss' : 'Show toast')
          .fnc { shown = !shown }
        )
        If(
          .cnd(shown)
          .obj(
            Animate(
              .enter(fade, slide(y: 12))
              .exit(fade)
              .obj(
                Container(
                  .config(
                    .border(color: line, width: 1)
                    color: panel
                    cornerRadius: 12
                    padding: sym(x: 16, y: 12)
                  )
                  .obj(Text('Booking saved'))
                )
              )
            )
          )
        )
      )
    )
  )
)
```

> **Try it**
> - Change `slide(y: 12)` to `scale(from: 0.8)`.
