## A fixed space

Gap is empty space of a fixed size along its parent's direction: across in a Row, down in a Column. Use a parent's `gap` for even spacing and Gap for one different space.

```layr
Row(
  .config(color: panel, cornerRadius: 12, padding: all(14), yAlign: mid)
  Text(.config(weight: semibold) .obj('LAYR'))
  Gap(8)
  Text(.config(color: muted) .obj('docs'))
  Gap(32)
  Text(.config(color: accent) .obj('Playground'))
)
```

> **Try it**
> - Change `Gap(32)` to `Gap(80)`.
