## Submitting a form

Form groups fields: `.fnc { … }` runs when it is submitted, by a Button with `submit: true` or by Enter in a field. The browser's own validation (`required`, `kind: email`) runs first.

```layr
Page(
  .name(Contact)
  .route('/')
  var txt email = ''
  var txt sent = ''
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(w: 320, gap: 12, padding: all(24))
        Form(
          .config(gap: 12)
          .fnc { sent = email }
          Input(
            .preset(default)
            .config(kind: email, label: 'Email', required: true, value: email)
            .fnc { email = value }
          )
          Button(.preset(default) .config(label: 'Notify me', submit: true))
        )
        Text(
          .config(color: muted)
          .obj(sent == '' ? 'Nothing sent yet.' : 'We will write to $sent.')
        )
      )
    )
  )
)
```

> **Try it**
> - Press **Notify me** with the field empty: the browser asks for an email first.
> - Enter an address and press Enter.
