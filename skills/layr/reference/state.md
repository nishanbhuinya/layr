---
title: State
description: var, const, bind, scope, and how long state lives.
order: 20
---

# State

State is what a page remembers. Declare it with `var`, and everything that reads it updates when it changes: no subscriptions, no setters.

```layr
Page(
  .name(Profile)
  .route('/')
  var txt name = 'Ada'
  var int visits = 0
  bind txt greeting = 'Hello, $name (visit ${visits + 1})'

  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 12, padding: all(24))
      Text(.config(size: 24, type: h2) .obj(greeting))
      Input(
        .preset(default)
        .config(label: 'Name', value: name)
        .fnc { name = value }
      )
      Button(.preset(default) .config(label: 'Visit') .fnc { visits++ })
    ))
  )
)
```

Three kinds of declaration are at work:

| Declaration | What it is | Here |
|---|---|---|
| `var` | State: change it and everything that reads it updates | `name`, `visits` |
| `bind` | Derived: always equal to its expression, never set by hand | `greeting` |
| `const` | A constant | |

Reading `name` in the `bind`, and `greeting` in the `Text`, is what connects them. Only the objects that read a value re-render when it changes.

> **Try it**
> - Type in the box: the heading follows each keystroke, through the `bind`.
> - Add `Text(.config(color: muted) .obj('${name.length} letters'))` at the end of the column.
> - Replace `.obj(greeting)` with `.obj('Hi, $name')`: the same updating text, written in place. A `bind` is a name for an expression you want to reuse.

## Where state lives

| Declared in | Lives |
|---|---|
| A file (outside any Page or Widget) | For the whole app, shared everywhere |
| A Page | For the session: kept when you navigate away and back. `.state(reset)` makes it start fresh on each visit |
| A Widget | One copy per instance, for as long as the instance is shown |
| A Function | For one call |

Because page state is kept, other pages can [Extract](/docs/export-extract-inject) it even when that page is not on screen.

## The whole syntax

```text
var int count = 0                   state
const txt title = 'Hello'           a constant
bind txt label = '$title: $count'   derived
!mut var int seed = 42              refuses changes from Export/Extract/Inject
_draft                              underscore names stay private to their file
```

## Types

`int num txt bool color paint len size insets align axis time obj list<T> map<K, V> any`, plus `T?` for values that may be empty. A declaration without a type (`var index = 0`) takes the type of its value.

## `!mut`

`!mut` marks something that must never change from outside its owner. The compiler rejects any Export/Extract/Inject write to it (L3101); at runtime such writes are ignored with a warning.
