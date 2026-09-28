## A checkbox or a switch

Toggle is a labelled on/off control: `kind: checkbox` (the default) or `kind: switch`. `.fnc { … }` runs with the new `value`.

```layr
Page(
  .name(Settings)
  .route('/')
  var bool notify = true
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(gap: 14, padding: all(24))
        Toggle(
          .config(
            kind: switch
            label: 'Email me when a room frees up'
            value: notify
          )
          .fnc { notify = value }
        )
        Text(
          .config(color: muted)
          .obj(notify ? 'You will get an email.' : 'No emails.')
        )
      )
    )
  )
)
```

> **Try it**
> - Flip the switch.
> - Change `kind: switch` to `kind: checkbox`.
