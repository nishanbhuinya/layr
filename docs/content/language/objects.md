---
title: Objects
description: Widgets, config, slots, ids, presets, per-frame config, conditions and lists.
order: 11
---

# Objects

Everything on screen is an **object**: a widget with config and children.

## Config

`.config(...)` holds keys. Dimensions come first, then keys in alphabetical order (the formatter keeps this order):

```layr
Container(
  .config(
    w: 240
    h: 120
    color: #ff6a3d
    cornerRadius: 16
    padding: all(16)
    shadow: shadow(y: 4, blur: 12, color: black.alpha(20%))
  )
)
```

Some keys group naturally:

```layr
Container(.config(size: 120, .border(align: in, color: #0d0d0d, width: 2)))
```

Every widget's keys, with types, defaults and aliases, are in the [API reference](/api).

## Children and slots

`.obj(x)` is the default slot for one child; `.objs(a, b)` for several. Positional children go into the default slot. Some widgets have named slots:

```layr
Page(
  .name(Slots)
  Scaffold(
    .bar(Row(.config(padding: all(12)) Text('Header')))
    .body(Column(Text('One'), Text('Two')))
    .footer(Text('Footer'))
  )
)
```

## Identity: `.id`

`.id(name)` names an object. Ids are unique within a Page or Widget, and are how other code reads and changes the object (see [Export, Extract and Inject](/docs/export-extract-inject)):

```layr
Container(.id(card) .config(w: 200, h: 100, color: #ff6a3d))
```

## Presets

A preset is a named bundle of config for a widget:

```layr
Preset(
  .name(pill)
  .for(Button)
  .config(padding: sym(x: 16, y: 8), cornerRadius: 999, color: #ff6a3d)
)

Page(
  .name(Buttons)
  Scaffold(
    .body(Row(
      Button(.preset(pill) .config(label: 'Save'))
      Button(.preset(default) .config(label: 'Cancel'))
    ))
  )
)
```

`.preset(default)` gives interactive widgets a neutral, accessible look. Core widgets are otherwise unstyled; styled kits come as [addons](/docs/addons).

## Per-frame config: `.at`

`.at(frame, key: value…)` changes config at a [design frame](/docs/design-scale). The plain `.config` value belongs to the smallest frame; if `.at` sets that frame itself, the plain value starts at the next frame up (so `.config(size: 72) .at(m, size: 34)` means 34 on phones, 72 from tablets). Numbers given at several frames are interpolated between them; add `step` to switch at the frame boundary instead:

```layr
Container(
  .config(w: 120, h: 40, color: #ff6a3d)
  .at(w, w: 480)
  .at(t, step h: 60)
)
```

## Conditions and lists

`If` shows one branch; `.fb(...)` is the fallback. `Each` repeats an object for every item:

```layr
Page(
  .name(Lists)
  var bool showAll = false
  const list<txt> names = ['Ada', 'Grace', 'Linus']

  Scaffold(
    .body(Column(
      If(.cnd(showAll) .obj(Text('Everyone')) .fb(Text('Just a few')))
      Each(.of(names) .as(name, i) .obj(Text('$i: $name')))
    ))
  )
)
```

## Accessibility

`Text(.config(type: h1))` renders a real heading. Images need `alt` (or `decorative: true`), and inputs need a `label`; the compiler reports L6001 and L6002 otherwise. `.a11y(label: ..., role: ...)` sets accessible names and roles on any object.
