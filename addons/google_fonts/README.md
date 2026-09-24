# Google Fonts

Every Google Font as a LAYR font value. Name the family and `font:` takes it; the stylesheet is added to the page the first time a family is used.

```layr
import { GoogleFonts } from '@dynshift/layr-google-fonts'

Text(.config(font: GoogleFonts.Fraunces, size: 40, weight: 600) .obj('Layout, authored.'))
```

## Naming a family

Write the family name without spaces: `GoogleFonts.SpaceGrotesk` is "Space Grotesk", `GoogleFonts.IBMPlexSans` is "IBM Plex Sans". For a name that doesn't survive that (digits, odd capitals), or to choose weights, use `GoogleFonts.font`:

```layr
import { GoogleFonts } from '@dynshift/layr-google-fonts'

Text(.config(font: GoogleFonts.font('M PLUS Rounded 1c', weights: [400, 800]), size: 28) .obj('Rounded'))
```

| Option | Meaning |
| --- | --- |
| `weights` | Weights to load, e.g. `[400, 700]`. By default every weight the family has. |
| `italic` | Also load the italics. |
| `fallback` | The generic stack shown until the font arrives. Guessed from the name (`Mono` → monospace, serif families → serif). |

## Faster first paint

Families load when a page first uses them. For the fonts on your first screen, put the stylesheet in `index.html` so a prerendered page starts downloading before any script runs:

```ts
import { href } from '@dynshift/layr-google-fonts'

href('Fraunces', 'Space Grotesk')
// https://fonts.googleapis.com/css2?family=Fraunces:wght@100..900&family=Space+Grotesk:wght@100..900&display=swap
```

Fonts are served by Google. If your privacy policy needs self-hosted files, download the family and use it by name with `font: 'Family'` and a `@font-face` rule instead.
