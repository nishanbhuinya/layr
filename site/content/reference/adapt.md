## A navigation that changes form

Adapt shows the first of its candidates that fits the space it is given. Write them from the most preferred to the most compact: a full row of links on a wide screen, a shorter one where that does not fit, a single button when nothing else does.

```layr
Adapt(
  .config(w: fill)
  Row(
    .config(gap: 20, yAlign: mid)
    Text('Docs')
    Text('Reference')
    Text('Playground')
    Text('Library')
    Text('Changelog')
  )
  Row(.config(gap: 16, yAlign: mid) Text('Docs'), Text('Playground'))
  Container(
    .config(color: sunken, cornerRadius: 8, padding: sym(x: 12, y: 6))
    .obj(Text('Menu'))
  )
)
```

> **Try it**
> - Switch the preview between `w`, `t` and `m`: each frame shows the first candidate that fits.
> - Drag the preview's corner handle to find the widths where it switches.
