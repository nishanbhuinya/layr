---
title: Widgets
description: Build your own widgets. Params become config keys.
order: 12
---

# Widgets

A `Widget` is a reusable object. Its params become config keys, so your widgets are used exactly like core ones.

```layr
Widget(
  .name(Card)
  .param(req txt title, color tint = #ff6a3d, len pad = 16)
  .obj(Container(
    .config(
      w: fill
      .border(color: param.tint, width: 2)
      color: white
      cornerRadius: 16
      padding: all(param.pad)
    )
    .obj(Column(
      .config(gap: 8)
      Text(.config(color: param.tint, type: h3) .obj(param.title))
      .obj
    ))
  ))
)

Page(
  .name(Cards)
  Scaffold(
    .body(Column(
      .config(gap: 12, padding: all(24))
      Card(.config(title: 'Hello') .obj(Text('Any object can go inside.')))
      Card(.config(title: 'Tinted', tint: #ef4444, pad: 24))
    ))
  )
)
```

## Params

```text
.param(
  req txt title          required
  color tint = #3b82f6   with a default
  num? ratio             optional (may be null)
  !mut len pad = 16      cannot be changed by Export/Extract/Inject
)
```

Read params as `param.name`. Types: `int num txt bool color paint len size insets align axis time obj list<T> any` (`double`, `string` and `padding` are accepted aliases).

## Forwarding the caller's object

`.obj` on its own, where an object is expected, forwards whatever the caller put in the widget's `.obj(...)`. In the example above, the card's text is forwarded into the card's column.

## Layout keys on your widgets

Callers may also set layout keys that apply to the widget's root: `w`, `h`, `minW`, `maxW`, `minH`, `maxH`, `margin`, `opacity`, `flex`, `shrink`, `hide` and `cursor`.

## Widget state and functions

A widget can hold its own state and Functions; each instance gets its own copy:

```layr
Widget(
  .name(Counter)
  .param(txt label = 'Count')
  var int n = 0
  Function(.name(add) .def { n++ })
  .obj(Button(.preset(default) .config(label: '${param.label}: $n') .fnc(add)))
)
```

## A file with one object

A file whose body is one object is an anonymous widget named after the file: `src/widgets/badge.layr` containing `Container(...)` can be imported as `import Badge from '../widgets/badge.layr'`.
