## Clear of notches and system bars

SafeArea pads its object by the device's safe-area insets: the notch, the rounded corners and the home indicator of a phone. On a screen without them the padding is zero, so this preview looks the same with or without it; open the page on a phone held sideways to see the difference.

```layr
SafeArea(
  .config(edges: x)
  .obj(
    Row(
      .config(
        w: fill
        color: panel
        cornerRadius: 12
        padding: all(14)
        xAlign: between
        yAlign: mid
      )
      Text(.config(weight: semibold) .obj('Room B'))
      Text(.config(color: muted) .obj('Available'))
    )
  )
)
```

`edges` chooses which sides: `all` (the default), `top`, `bottom`, `x` (left and right) or `y` (top and bottom). A Scaffold already keeps its content inside the safe area, so SafeArea is for full-bleed parts you place yourself.
