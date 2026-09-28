## A cover image

Image shows a picture. Give it `alt` text (or `decorative: true` when it adds nothing for a screen reader). `fit` says how it fills its box: `cover` crops to fill, `contain` shows all of it. Images load lazily unless you set `lazy: false`.

```layr
Column(
  .config(w: 320, gap: 10)
  Image(
    .config(
      w: fill
      h: 170
      alt: 'The LAYR link-preview card'
      cornerRadius: 14
      fit: cover
      src: '/og.png'
    )
  )
  Text(
    .config(size: 13, color: muted)
    .obj('fit: cover crops the picture to fill the box.')
  )
)
```

> **Try it**
> - Change `fit: cover` to `fit: contain`.
> - Add `position: midLeft`: `cover` crops from the right instead of evenly.

## A round avatar

```layr
Row(
  .config(gap: 12, yAlign: mid)
  Image(.config(size: 48, alt: 'LAYR', cornerRadius: 999, src: '/icon-512.png'))
  Column(
    Text(.config(weight: semibold) .obj('LAYR'))
    Text(.config(size: 13, color: muted) .obj('@dynshift'))
  )
)
```
