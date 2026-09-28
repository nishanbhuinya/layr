## A labelled field

Input is a text field with its `label` (always present for screen readers). `.fnc { … }` runs on every change with the new `value`; store it in state and show it anywhere. `kind` picks the keyboard and validation (`email`, `password`, `number`, `search`, `tel`, `url`), and `multiline: true` makes a text area.

```layr
Page(
  .name(Signup)
  .route('/')
  var txt name = ''
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(w: 320, gap: 12, padding: all(24))
        Input(
          .preset(default)
          .config(label: 'Your name', placeholder: 'Ada', value: name)
          .fnc { name = value }
        )
        Text(
          .config(color: muted)
          .obj(name == '' ? 'Type your name above.' : 'Hello, $name.')
        )
      )
    )
  )
)
```

> **Try it**
> - Type in the field: the line below follows every key.
> - Add `kind: email` and `required: true` to the Input's config.
