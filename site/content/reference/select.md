## A choice from a list

Select is a labelled drop-down. `options` is a list, `value` the chosen one, and `.fnc { … }` runs with the new `value`.

```layr
Page(
  .name(Booking)
  .route('/')
  var txt room = 'Room B'
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(gap: 12, padding: all(24))
        Select(
          .config(
            label: 'Room'
            options: ['Room A', 'Room B', 'Room C']
            value: room
          )
          .fnc { room = value }
        )
        Text(.config(color: muted) .obj('Booking $room'))
      )
    )
  )
)
```

> **Try it**
> - Pick another room.
> - Add `'Studio 1'` to `options`.
