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
  .param(
    req txt title
    color tint = accent
    len pad = 16
  )
  .wgt(
    Container(
      .config(
        w: fill
        color: panel
        cornerRadius: 14
        padding: all(param.pad)
        .border(
          color: param.tint
          width: 2
        )
      )
      .obj(
        Column(
          .config(gap: 6)
          Text(
            .config(
              size: 17
              color: param.tint
              weight: semibold
            )
            .obj(param.title)
          )
          .obj
        )
      )
    )
  )
)

Page(
  .name(Cards)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(
          gap: 12
          padding: all(24)
        )
        Card(
          .config(title: 'Hello')
          .obj(Text('Any object can go inside.'))
        )
        Card(
          .config(
            title: 'Tinted, roomier'
            tint: teal
            pad: 28
          )
        )
      )
    )
  )
)
```

Read it in two halves. The `Widget` says what a Card *is*: `.wgt(...)` holds what it renders, a bordered container with a title, and `.obj` marks where the caller's content goes. The `Page` *uses* it twice, and each `Card(...)` sets the params the way any object sets config.

> **Since 3.2** a Widget's body is `.wgt(...)`. Before, it was `.obj(...)`, the same word as the slot its callers fill. The old spelling still compiles, with a warning (L1017), until LAYR 4. `layr upgrade` rewrites it once you agree, and so does **Update all** in VS Code.

> **Try it**
> - Add `Card(.config(title: 'Third', tint: violet))` under the other two.
> - Change `cornerRadius: 14` in the Widget to `0`: every card changes, because there is one definition.
> - Remove `title: 'Hello'` from the first card. `title` is `req`uired, so the result reports the error instead of running.

## Params

```text
.param(
  req txt title              required: every use must set it
  color tint = accent        with a default
  num? ratio                 optional (may be null)
  align edge = in | mid | out    one of the listed values; the first is the default
  !mut len pad = 16          cannot be changed by Export/Extract/Inject
)
```

Read a param as `param.name`. Types: `int num txt bool color paint len size insets align axis time obj list<T> any` (`double`, `string`, `object` and `padding` are accepted aliases).

A param with listed values only takes those: `Card(.config(edge: left))` is an error that names the choices, and so is passing the param to a key that cannot take one of them. A misspelt `param.nmae` names the param you meant.

## The caller's object

`.obj` on its own, where an object is expected, forwards whatever the caller put in the widget's `.obj(...)`. Above, `Text('Any object can go inside.')` lands in the card's column, under the title.

You can also declare it as a param named `obj` and use it like any other, which reads well when the widget requires one:

```layr
Widget(
  .name(Badge)
  .param(
    req obj obj
    color tint = accent
  )
  .wgt(
    Container(
      .config(
        color: param.tint
        cornerRadius: 99
        padding: sym(x: 10, y: 4)
      )
      .obj(param.obj)
    )
  )
)

Page(
  .name(Badges)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(
      Row(
        .config(
          gap: 8
          padding: all(24)
        )
        Badge(.obj(Text('New')))
        Badge(
          .config(tint: teal)
          .obj(Text('Shipped'))
        )
      )
    )
  )
)
```

`req obj obj` makes the object required: `Badge()` with nothing inside is an error. The text on each badge picks a readable colour for its paint by itself.

## Layout keys on your widgets

Callers can also set layout keys that apply to the widget's root: `w`, `h`, `minW`, `maxW`, `minH`, `maxH`, `margin`, `opacity`, `flex`, `shrink`, `hide` and `cursor`. `Card(.config(title: 'Narrow', maxW: 240))` works without the widget declaring anything.

## Widget state and functions

A widget can hold its own state and Functions, and every instance has its own copy:

```layr
Widget(
  .name(Counter)
  .param(txt label = 'Count')
  var int n = 0
  Function(
    .name(add)
    .def { n++ }
  )
  .wgt(
    Button(
      .preset(default)
      .config(label: '${param.label}: $n')
      .fnc(add)
    )
  )
)

Page(
  .name(Counters)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(
      Row(
        .config(
          gap: 12
          padding: all(24)
        )
        Counter(.config(label: 'Apples'))
        Counter(.config(label: 'Pears'))
      )
    )
  )
)
```

> **Try it**
> - Click each button a few times: the two counts are separate.
> - Move `var int n = 0` out of the Widget, to the top of the file. Now both buttons share one count, because file-level state belongs to the whole app ([State](/docs/state)).

## A file with one object

A file whose body is one object is an anonymous widget named after the file: `src/widgets/badge.layr` containing `Container(...)` can be imported as `import Badge from '../widgets/badge.layr'`.
