## Registering an icon set

Icon shows an icon by name from the icons you register. Register SVG strings once with `icons({ name: '<svg…>' })` from `@dynshift/layr/react` (here in a `.react { }` block); any icon library's SVGs work. Draw the shapes in `currentColor` and the Icon's `color` colours them. Give a `label` when the icon means something on its own; without one it is decorative and hidden from screen readers.

```layr
import { icons } from '@dynshift/layr/react'

Page(
  .name(Icons)
  .route('/')
  .react {
    icons({
      star: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>',
      heart: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9z"/></svg>',
    })
  }
  Scaffold(
    .config(color: canvas)
    .body(
      Row(
        .config(gap: 16, padding: all(24), yAlign: mid)
        Icon(.config(size: 28, color: gold, label: 'Starred', name: 'star'))
        Icon(.config(size: 28, color: ember, label: 'Liked', name: 'heart'))
        Text('Starred and liked')
      )
    )
  )
)
```

> **Try it**
> - Change `size: 28` to `size: 48` on the star.
> - Change `color: ember` to `color: violet`.
