## Tags that wrap

Wrap lays its objects out in rows and starts a new line when a row is full. `gap` is the space between objects on a line, `runGap` the space between lines.

```layr
Wrap(
  .config(w: 300, gap: 8, runGap: 8)
  Container(
    .config(color: sunken, cornerRadius: 999, padding: sym(x: 12, y: 5))
    .obj(Text(.config(size: 13) .obj('Design Scale')))
  )
  Container(
    .config(color: sunken, cornerRadius: 999, padding: sym(x: 12, y: 5))
    .obj(Text(.config(size: 13) .obj('Layout')))
  )
  Container(
    .config(color: sunken, cornerRadius: 999, padding: sym(x: 12, y: 5))
    .obj(Text(.config(size: 13) .obj('Export, Extract, Inject')))
  )
  Container(
    .config(color: sunken, cornerRadius: 999, padding: sym(x: 12, y: 5))
    .obj(Text(.config(size: 13) .obj('Animation')))
  )
  Container(
    .config(color: sunken, cornerRadius: 999, padding: sym(x: 12, y: 5))
    .obj(Text(.config(size: 13) .obj('Effects')))
  )
)
```

> **Try it**
> - Change `w: 300` to `w: 520`: more tags fit on a line.
> - Add `xAlign: mid` to the Wrap's config.
