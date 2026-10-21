## Styles inside the string

RichText writes styled runs inside one string. `(style, style…)[text]` styles the text in brackets, and `*bold*`, `_italic_`, `` `code` `` and `~strike~` mark words. Runs nest. Its own config styles the whole text, like a Text's.

```layr
RichText(
  .config(
    size: 17
    lineHeight: 1.6
  )
  .obj('
    Room B is (teal)[free] at (accent, bold)[10:30] for ~€60~ *€48*.\n
    (13, muted)[Prices include _everything_. See (link: /docs/objects)[the docs] for `RichText`.]

    A blank line starts a paragraph. (hL.gold.40)[Highlights] work too.
  ')
)
```

> **Try it**
> - Change `(teal)[free]` to `(teal.50, 24)[free]`: half-opaque and bigger.
> - Put a slash before it, `/(teal)[free]`, to show the markup as written.

## The markup

| Write | Shows |
|---|---|
| `(blue)[text]`, `(#0d0d0d)[text]`, `(accent)[text]` | a colour: named, hex or a theme colour |
| `(green.50)[text]` | a colour at 50% opacity |
| `(24)[text]` | a size, in design px |
| `(weight.700)[text]`, `(bold)[text]`, `(italic)[text]` | weight and style; also `underline`, `strike`, `code` |
| `(hL.gold.30)[text]` | a highlight behind the text, with its opacity |
| `(link: /docs)[text]` | a link (in-app paths navigate without a reload) |
| `(grey.90, bold, 35)[text]` | several styles at once |
| `*bold*` `_italic_` `` `code` `` `~strike~` | marks; they need a space or punctuation around them, so `snake_case` and `2 * 3` stay as written |
| `\n` | a line break; a blank line starts a paragraph; other line breaks in the source are spaces |
| `/(`, `/*`, `/_` | the markup as written; each further slash shows one slash (`//(blue)[x]` shows `/(blue)[x]`) |

Values from `$name` and `${expr}` are always plain text, never markup, so a name with a `*` in it cannot restyle the page. A style the compiler does not know is shown as written, with warning L1018. The string may run over several lines between quotes.
