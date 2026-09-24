# @dynshift/layr-icons

The LAYR icon set. Import it once; then the core `Icon` widget draws any of its icons by name.

```layr
import '@dynshift/layr-icons'

Row(Icon('star'), Icon(.config(name: 'heart', color: red, size: 32, label: 'Liked')))
```

Icons take the current text colour. Give an icon a `label` when it carries meaning; otherwise it is hidden from screen readers.

Icons: arrow-right, arrow-left, arrow-up, arrow-down, chevron-right, chevron-left, chevron-up, chevron-down, check, x, plus, minus, menu, search, star, heart, home, user, settings, external-link, copy, sun, moon, info, alert, mail, calendar, clock, download, upload, trash, edit, link, code, layers, grid, play, github.
