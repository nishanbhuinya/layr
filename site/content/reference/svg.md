## A logo from a file

Svg shows an SVG file at the size you give it. Without `color` it keeps the file's own colours.

```layr
Row(
  .config(gap: 12, yAlign: mid)
  Svg(.config(size: 40, alt: 'LAYR', src: '/icon.svg'))
  Text(.config(size: 20, weight: semibold) .obj('LAYR'))
)
```

## In the theme's colour

With `color`, the SVG's shape is filled with that colour, so a one-colour icon or logo follows the theme. Here the same file becomes a flat rounded square in the accent colour: the shape is the file's outline, the colour is yours.

```layr
Row(
  .config(gap: 16, yAlign: mid)
  Svg(.config(size: 40, alt: 'LAYR', color: accent, src: '/icon.svg'))
  Svg(.config(size: 40, alt: 'LAYR', color: teal, src: '/icon.svg'))
  Svg(.config(size: 40, alt: 'LAYR', color: ink, src: '/icon.svg'))
)
```

> **Try it**
> - Change a `color` to `gold`, or remove it to see the file's own colours again.
