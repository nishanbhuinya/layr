---
title: Syntax
description: Items, modifiers, props, values, units, colours, strings and comments.
order: 10
---

# Syntax

A `.layr` file is a list of **items**. An object is a name followed by its items in round brackets:

```layr
Container(
  .config(w: 220, color: panel, cornerRadius: 12, padding: all(16))
  .obj(Text('Hello'))
)
```

## The one rule

**`( )` holds LAYR structure. `{ }` holds TypeScript.** Objects, config and children go in round brackets. Code that *does* something goes in curly braces: here, what a click does.

```layr
Page(
  .name(Counter)
  .route('/')
  var int count = 0
  Scaffold(
    .config(color: canvas)
    .body(Row(
      .config(gap: 12, padding: all(24), yAlign: mid)
      Button(.preset(default) .config(label: 'Add one') .fnc { count++ })
      Text('Clicked $count times')
    ))
  )
)
```

> **Try it**
> - Change `count++` to `count += 10`. Anything TypeScript accepts works inside the braces.
> - Change the text to `'Clicked ${count * 2} halves'`: `$name` inserts a value, `${...}` inserts an expression.

## Items

Items are separated by line breaks or commas. Two items on one line need a comma, except modifiers, which may follow each other with a space.

| Item | Looks like | Example |
|---|---|---|
| Modifier | `.name(...)` or `.name { ts }` | `.config(w: 200)`, `.fnc { count++ }` |
| Prop | `key: value` | `w: 200` |
| Declaration | `[export] [!mut] var\|const\|bind type name = value` | `var int count = 0` |
| Object or value | anything else | `Text('Hi')`, `'Hello'` |

## Two forms of the same object

The expanded form puts config in `.config(...)` and children in `.obj(...)`. The shorthand puts props and children straight into the call. These two are the same object:

```layr noexec
Container(.config(padding: all(12)) .obj(Column(Text('One'), Text('Two'))))

Container(padding: all(12), Column(Text('One'), Text('Two')))
```

`layr format` keeps the shorthand when it fits on one line and expands it otherwise, so a file only ever has one spelling.

## Numbers are design pixels

A plain number is a **design pixel**: a pixel of your design at its design frame. [Design Scale](/docs/design-scale) turns it into the right size on every screen. `px` is a real screen pixel that never scales, for things like a hairline.

```layr
Column(
  Container(
    .config(w: 240, h: 36, color: accent)
    .obj(Text(.config(color: onAccent) .obj('w: 240 (design px)')))
  )
  Container(
    .config(w: 240px, h: 36, color: teal)
    .obj(Text(.config(color: onAccent) .obj('w: 240px (screen px)')))
  )
)
```

> **Try it**
> - Press **m**, **t** and **w** in the result bar. The first bar scales with the frame; the second stays exactly 240 screen pixels.

## Values

| Kind | Examples |
|---|---|
| Lengths | `200` (design px), `200ds`, `12px`, `50%`, `1fr`, `fill`, `hug` |
| Time and angles | `300ms`, `1.5s`, `45deg` |
| Colours | `#fff`, `#0d0d0d`, `#0d0d0d80`, `0xFF0D0D0D`, `rgb(13, 13, 13)`, `white`, a theme colour such as `accent` |
| Colour methods | `#fff.alpha(50%)`, `white.shade(2)`, `accent.tint(1)`, `ink.invert`, `a.mix(b, .3)` |
| Insets | `all(20)`, `sym(x: 20, y: 10)`, `only(left: 20, top: 8)` |
| Sizes | `(200, 120)` where a size is expected |
| Lists | `[1, 2, 3]` |
| Strings | `'Hello $name'`, `'Total: ${a + b}'` |
| Alignments | `topLeft`, `topMid`, `mid`, `bottomRight`… (short forms such as `tL`, `rB` are accepted) |

Colour methods work on theme colours too, so a whole palette can come from one accent:

```layr
Row(
  .config(gap: 8)
  Container(.config(size: 48, color: accent, cornerRadius: 10))
  Container(.config(size: 48, color: accent.alpha(60%), cornerRadius: 10))
  Container(.config(size: 48, color: accent.alpha(30%), cornerRadius: 10))
  Container(.config(size: 48, color: accent.mix(teal, 50%), cornerRadius: 10))
  Container(.config(size: 48, color: teal, cornerRadius: 10))
)
```

## Comments

```layr noexec
// A line comment
/* A block comment */
Text('Hi') // after an item
```

`#` always starts a colour, never a comment.

## Aliases and canonical form

LAYR accepts common alternative spellings while you type (`Col`, `Center`, `width`, `pad`, `.exc`, `.opacity()`), reports them as info, and `layr format` rewrites them to the canonical name (`Column`, `Mid`, `w`, `padding`, `.exe`, `.alpha()`). Stored code is always canonical.

## Arrow functions

Callbacks are arrow functions written right inside an expression: `(a) => a.done`, or `a => a.done` for one parameter.

```layr
Page(
  .name(Tasks)
  .route('/')
  const list<txt> tasks = ['Write', 'Format', 'Ship']
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 8, padding: all(24))
      Each(.of(tasks.filter((t) => t != 'Format')) .as(t) .obj(Text('• $t')))
      Text(
        .config(color: muted)
        .obj('${tasks.map((t) => t.toUpperCase()).join(", ")}')
      )
    ))
  )
)
```

> **Try it**
> - Change `t != 'Format'` to `t.length > 4`.
