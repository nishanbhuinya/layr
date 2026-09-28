## Mixed styles in one line

Span styles a run of text inside a Text: a bold word, a coloured price, a struck-out old value. The runs flow and wrap together as one paragraph.

```layr
Text(
  .config(size: 17, lineHeight: 1.5)
  Span(.config(weight: semibold) .obj('Room B'))
  ' is free at '
  Span(.config(color: accent, weight: semibold) .obj('10:30'))
  ' for '
  Span(.config(color: faint, strike: true) .obj('€60'))
  ' '
  Span(.config(weight: semibold) .obj('€48'))
  '.'
)
```

> **Try it**
> - Add `italic: true` to the first Span's config.
> - Change the price Span's `color: accent` to `color: teal`.
