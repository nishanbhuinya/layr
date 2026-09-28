## A counter

Button is an accessible button: `.fnc { … }` runs when it is clicked, tapped, or pressed with Enter or Space. It is unstyled; style it like a Container, or start from `.preset(default)`. Every Button gives a little when pressed.

```layr
Page(
  .name(Counter)
  .route('/')
  var int count = 0
  Scaffold(
    .config(color: canvas)
    .body(
      Row(
        .config(gap: 12, padding: all(24), yAlign: mid)
        Button(
          .config(color: accent, cornerRadius: 10, padding: sym(x: 18, y: 10))
          .fnc { count++ }
          .obj(Text(.config(color: onAccent, weight: semibold) .obj('Add one')))
        )
        Button(
          .preset(default)
          .config(disabled: count == 0, label: 'Reset')
          .fnc { count = 0 }
        )
        Text(.config(size: 18, weight: semibold) .obj('$count'))
      )
    )
  )
)
```

> **Try it**
> - Press **Add one** a few times, then **Reset**: Reset is disabled while the count is 0.
> - Change `count++` to `count += 5`.

`label` gives a Button plain text; for styled content put a Text in its `.obj`. Either way the text is its accessible name. In a Form, `submit: true` makes a Button submit it.
