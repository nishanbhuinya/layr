## Focus where it belongs

Focus controls keyboard focus for its object: `auto: true` focuses it when it appears, `trap: true` keeps Tab inside it (for a menu or a dialog you draw yourself), and `ring: false` hides the focus ring for a pointer while keyboard users still see it. Here the search field is focused as soon as the panel opens.

```layr
Page(
  .name(Search)
  .route('/')
  var bool open = false
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(w: 320, gap: 12, padding: all(24))
        Button(
          .preset(default)
          .config(label: open ? 'Close search' : 'Search')
          .fnc { open = !open }
        )
        If(
          .cnd(open)
          .obj(
            Focus(
              .config(auto: true)
              .obj(
                Input(
                  .preset(default)
                  .config(label: 'Search rooms', placeholder: 'Room B')
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
> - Press **Search**: the field appears with the cursor already in it.
> - Remove `auto: true`: you have to click the field first.
