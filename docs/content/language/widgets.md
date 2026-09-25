---
title: Widgets
description: Build your own widgets. Params become config keys.
order: 12
---

# Widgets

A `Widget` is an object you define once and use anywhere. Its **params** become its config keys, so your widgets are used exactly like the core ones.

```layr
Widget(
  .name(Card)
  .param(req txt title, color tint = accent, len pad = 16)
  .obj(Container(
    .config(
      w: fill
      .border(color: param.tint, width: 2)
      color: panel
      cornerRadius: 14
      padding: all(param.pad)
    )
    .obj(Column(
      .config(gap: 6)
      Text(
        .config(size: 17, color: param.tint, weight: semibold)
        .obj(param.title)
      )
      .obj
    ))
  ))
)

Page(
  .name(Cards)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 12, padding: all(24))
      Card(.config(title: 'Hello') .obj(Text('Any object can go inside.')))
      Card(.config(title: 'Tinted, roomier', tint: teal, pad: 28))
    ))
  )
)
```

Read it in two halves. The `Widget` says what a Card *is*: a bordered container with a title, and `.obj` where the caller's content goes. The `Page` *uses* it twice, and each `Card(...)` sets the params the way any object sets config.

> **Try it**
> - Add `Card(.config(title: 'Third', tint: violet))` under the other two.
> - Change `cornerRadius: 14` in the Widget to `0`: every card changes, because there is one definition.
> - Remove `title: 'Hello'` from the first card. `title` is `req`uired, so the result reports the error instead of running.

## Params

```text
.param(
  req txt title          required: every use must set it
  color tint = accent    with a default
  num? ratio             optional (may be null)
  !mut len pad = 16      cannot be changed by Export/Extract/Inject
)
```

Read a param as `param.name`. Types: `int num txt bool color paint len size insets align axis time obj list<T> any` (`double`, `string` and `padding` are accepted aliases).

## Forwarding the caller's object

`.obj` on its own, where an object is expected, forwards whatever the caller put in the widget's `.obj(...)`. Above, `Text('Any object can go inside.')` lands in the card's column, under the title.

## Layout keys on your widgets

Callers can also set layout keys that apply to the widget's root: `w`, `h`, `minW`, `maxW`, `minH`, `maxH`, `margin`, `opacity`, `flex`, `shrink`, `hide` and `cursor`. `Card(.config(title: 'Narrow', maxW: 240))` works without the widget declaring anything.

## Widget state and functions

A widget can hold its own state and Functions, and every instance has its own copy:

```layr
Widget(
  .name(Counter)
  .param(txt label = 'Count')
  var int n = 0
  Function(.name(add) .def { n++ })
  .obj(Button(.preset(default) .config(label: '${param.label}: $n') .fnc(add)))
)

Page(
  .name(Counters)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(Row(
      .config(gap: 12, padding: all(24))
      Counter(.config(label: 'Apples'))
      Counter(.config(label: 'Pears'))
    ))
  )
)
```

> **Try it**
> - Click each button a few times: the two counts are separate.
> - Move `var int n = 0` out of the Widget, to the top of the file. Now both buttons share one count, because file-level state belongs to the whole app ([State](/docs/state)).

## A file with one object

A file whose body is one object is an anonymous widget named after the file: `src/widgets/badge.layr` containing `Container(...)` can be imported as `import Badge from '../widgets/badge.layr'`.
