---
title: Syntax
description: Items, modifiers, props, values, units, colours, strings and comments.
order: 10
---

# Syntax

A `.layr` file is a list of **items**. An object is a name followed by items in parentheses:

```layr
Container(
  .config(w: 200, h: 120, color: #0d0d0d, cornerRadius: 16)
  .obj(Text('Hello'))
)
```

## The one rule

**`( )` holds LAYR structure. `{ }` holds TypeScript.**

```layr
Page(
  .name(Counter)
  var int count = 0
  Scaffold(
    .body(Button(.preset(default) .config(label: 'Add') .fnc { count++ }))
  )
)
```

## Items

Items are separated by line breaks or commas. Two items on one line need a comma, except modifiers, which may follow each other with a space.

| Item | Looks like | Example |
|---|---|---|
| Modifier | `.name(...)` or `.name { ts }` | `.config(w: 200)`, `.fnc { count++ }` |
| Prop | `key: value` | `w: 200` |
| Declaration | `[export] [!mut] var\|const\|bind type name = value` | `var int count = 0` |
| Object or value | anything else | `Text('Hi')`, `'Hello'` |

## Two forms of the same object

The expanded form puts config in `.config(...)` and children in `.obj(...)`. The shorthand puts props and children straight into the call:

```layr
Container(color: red, Column(Text('1'), Text('2')))
```

Both are LAYR. `layr format` keeps the shorthand when it fits on one line and expands it otherwise.

## Values

| Kind | Examples |
|---|---|
| Lengths | `200` (design px), `200ds`, `12px`, `50%`, `1fr`, `fill`, `hug` |
| Time and angles | `300ms`, `1.5s`, `45deg` |
| Colours | `#fff`, `#0d0d0d`, `#0d0d0d80`, `0xFF0D0D0D`, `rgb(13, 13, 13)`, `white`, `blue` |
| Colour methods | `#fff.alpha(50%)`, `white.shade(2)`, `brand.tint(1)`, `ink.invert`, `a.mix(b, .3)` |
| Insets | `all(20)`, `sym(x: 20, y: 10)`, `only(left: 20, top: 8)` |
| Sizes | `(200, 120)` where a size is expected |
| Lists | `[1, 2, 3]` |
| Strings | `'Hello $name'`, `'Total: ${a + b}'` |
| Alignments | `topLeft`, `topMid`, `mid`, `bottomRight`… (short forms such as `tL`, `rB` are accepted) |

A plain number is a **design pixel**: it scales with the screen through [Design Scale](/docs/design-scale). Use `px` only for things that must never scale, such as a 1px hairline.

## Comments

```layr
// A line comment
/* A block comment */
Text('Hi') // after an item
```

`#` always starts a colour, never a comment.

## Aliases and canonical form

LAYR accepts common alternative spellings while you type (`Col`, `Center`, `width`, `pad`, `.exc`, `.opacity()`), reports them as info, and `layr format` rewrites them to the canonical name (`Column`, `Mid`, `w`, `padding`, `.exe`, `.alpha()`). Stored code is always canonical.

## Arrow functions

Callbacks are written as arrow functions, right inside an expression: `(a) => a.done`, or `a => a.done` for one parameter. The parameters are plain values inside the body.

```layr
Page(
  .name(Tasks)
  .route('/')
  const list<txt> tasks = ['Write', 'Format', 'Ship']
  Scaffold(
    .body(Column(
      .config(gap: 8, padding: all(24))
      Each(.of(tasks.filter((t) => t != 'Format')) .as(t) .obj(Text(t)))
      Text('${tasks.map((t) => t.toUpperCase()).join(", ")}')
    ))
  )
)
```
