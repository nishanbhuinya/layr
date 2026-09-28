## A dialog

Overlay shows content above the page, with focus moved into it and back when it closes. It is shown while `open` is true; `modal: true` (the default) blocks the page behind it, and `dismissible: true` (the default) closes it on Escape or a click on the backdrop, raising `close`. It is unstyled: its `.obj` is the dialog you draw.

```layr
Page(
  .name(Dialog)
  .route('/')
  var bool open = false
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(gap: 12, padding: all(24))
        Button(
          .preset(default)
          .config(label: 'Cancel booking')
          .fnc { open = true }
        )
        Overlay(
          .config(label: 'Cancel booking', open: open)
          .on(close: { open = false })
          .obj(
            Container(
              .config(
                w: 300
                color: panel
                cornerRadius: 16
                padding: all(20)
                shadow: shadow(y: 16, blur: 40, color: black.alpha(25%))
              )
              .obj(
                Column(
                  .config(gap: 12)
                  Text(
                    .config(size: 18, weight: semibold)
                    .obj('Cancel this booking?')
                  )
                  Text(
                    .config(color: muted)
                    .obj('Room B, Tuesday 10:30. This cannot be undone.')
                  )
                  Row(
                    .config(w: fill, gap: 8, xAlign: end)
                    Button(
                      .preset(default)
                      .config(label: 'Keep it')
                      .fnc { open = false }
                    )
                    Button(
                      .config(
                        color: danger
                        cornerRadius: 8
                        padding: sym(x: 14, y: 8)
                      )
                      .fnc { open = false }
                      .obj(
                        Text(
                          .config(color: onAccent, weight: semibold)
                          .obj('Cancel')
                        )
                      )
                    )
                  )
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
> - Open the dialog and press Escape: it closes.
> - Add `dismissible: false` to the Overlay's config: now only the buttons close it.
