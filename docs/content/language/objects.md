---
title: Objects
description: Widgets, config, slots, ids, presets, per-frame config, conditions and lists.
order: 11
---

# Objects

Everything on screen is an **object**: a widget, its **config** (how it looks and sizes), and its **children** (what is inside it). This page takes those three parts one at a time.

## Config and children

`.config(...)` sets the object's features. `.obj(...)` holds the one object inside it.

```layr
Container(
  .config(
    w: 240
    .border(color: line, width: 1)
    color: panel
    cornerRadius: 16
    padding: all(20)
  )
  .obj(Text(.config(size: 17, weight: semibold) .obj('A card, 240 wide')))
)
```

Every number is in design pixels. `padding: all(20)` is space on all four sides inside the edge; `.border(...)` is a **group**, several related keys written together.

> **Try it**
> - Change `all(20)` to `sym(x: 40, y: 8)`: 40 on the left and right, 8 above and below.
> - Change `cornerRadius: 16` to `cornerRadius: 999`: fully round ends.
> - Delete `w: 240`: the card now *hugs* its text, the default for every object.

The formatter keeps config in one order, sizes first (`w`, `h`, `size`, the `min`/`max` keys), then the rest alphabetically, so every file reads the same. Every widget's keys, with types and defaults, are in the [API reference](/api).

## Slots: where children go

A widget with several places for children names them. `Scaffold`, the screen, has a `.bar` on top, a `.body` that scrolls, and a `.footer`. Each band below says which slot it is in:

```layr
Page(
  .name(Slots)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .bar(Row(
      .config(w: fill, color: sunken, padding: all(14))
      Text(.config(weight: semibold) .obj('.bar'))
    ))
    .body(Column(
      .config(w: fill, gap: 8, padding: all(20))
      Text('.body: the page content')
      Text(
        .config(color: muted)
        .obj('It scrolls when it is taller than the screen.')
      )
    ))
    .footer(Row(
      .config(w: fill, color: sunken, padding: all(14))
      Text(.config(color: muted) .obj('.footer'))
    ))
  )
)
```

`.obj(x)` is the default slot for one child and `.objs(a, b)` the list form. Children written straight into the call (`Column(Text('One'), Text('Two'))`) go into the default slot.

> **Try it**
> - Remove the whole `.footer(...)` line: the body takes its space.
> - Add a third `Text('More')` to the body.

## Identity: `.id`

`.id(name)` names an object. An id is unique inside its Page or Widget, and it is how other code reaches the object: `Slots.card` from any file, to read or change it with [Export, Extract and Inject](/docs/export-extract-inject).

```layr noexec
Container(.id(card) .config(w: 200, color: panel, padding: all(16)))
```

Objects without an id are still reachable by their **lookup path**, one `.` per level (`Slots.scaffold.body.column.text(1)`). Ids survive edits that would change a path.

## Presets: a name for a look

A preset is a named bundle of config for one widget. Define it once, use it anywhere:

```layr
Preset(
  .name(pill)
  .for(Button)
  .config(
    padding: sym(x: 16, y: 8)
    cornerRadius: 999
    color: sunken
    .border(color: lineStrong, width: 1)
  )
)

Page(
  .name(Buttons)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(Row(
      .config(gap: 12, padding: all(24))
      Button(.preset(pill) .config(label: 'Save'))
      Button(.preset(pill) .config(label: 'Share'))
      Button(.preset(default) .config(label: 'Cancel'))
    ))
  )
)
```

Config written on the object wins over its preset: `Button(.preset(pill) .config(color: accent))` keeps the pill shape with an accent fill. `.preset(default)` is LAYR's neutral, accessible look for interactive widgets; core widgets are otherwise unstyled.

> **Try it**
> - In the `Preset`, change `cornerRadius: 999` to `6`: all three pill buttons change together, `Cancel` does not.

## Per-frame config: `.at`

`.at(frame, key: value)` changes config at a [design frame](/docs/design-scale): `m` (phone), `t` (tablet), `w` (desktop). The plain `.config` value is the one for phones.

```layr
Container(
  .config(w: 160, color: accent, padding: all(16))
  .at(w, w: 480)
  .obj(Text(
    .config(color: onAccent, weight: semibold)
    .obj('160 on phones, 480 on desktop')
  ))
)
```

Between frames the number is **interpolated**: at a tablet width it is part way between 160 and 480, so nothing jumps. Write `step` for a value that switches at the frame instead: `.at(t, step h: 60)`.

> **Try it**
> - Press **m**, **t** and **w** in the result bar and watch the width move.
> - Add `.at(t, color: violet)`: colours cannot be part way, so they switch at the frame.

## Conditions and lists

`If` shows one branch or the other (`.fb(...)` is the fallback). `Each` repeats an object for every item of a list:

```layr
Page(
  .name(Lists)
  .route('/')
  var bool showAll = false
  const list<txt> names = ['Ada', 'Grace', 'Linus', 'Margaret']

  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 10, padding: all(24))
      Button(
        .preset(default)
        .config(label: showAll ? 'Show fewer' : 'Show everyone')
        .fnc { showAll = !showAll }
      )
      If(
        .cnd(showAll)
        .obj(Each(.of(names) .as(name, i) .obj(Text('${i + 1}. $name'))))
        .fb(Text(.config(color: muted) .obj('${names.length} people, hidden')))
      )
    ))
  )
)
```

> **Try it**
> - Add `'Barbara'` to the list and run: `Each` shows five without any other change.
> - Swap the `.obj(...)` and `.fb(...)` contents: the condition now works the other way round.

## Accessibility

`Text(.config(type: h1))` renders a real heading. Images need `alt` (or `decorative: true`) and inputs need a `label`: the compiler reports L6001 and L6002 otherwise. `.a11y(label: ..., role: ...)` sets an accessible name and role on any object.
