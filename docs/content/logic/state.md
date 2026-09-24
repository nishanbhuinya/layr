---
title: State
description: var, const, bind, scope, and how long state lives.
order: 20
---

# State

```text
var int count = 0                   state: change it and everything that reads it updates
const txt title = 'Hello'           a constant
bind txt label = '$title: $count'   derived: always equal to its expression
!mut var int seed = 42              refuses changes from Export/Extract/Inject
_draft                              underscore names stay private to their file
```

State is reactive. Reading `count` in config, text or a `bind` subscribes to it; only the objects that read it re-render.

```layr
Page(
  .name(Profile)
  var txt name = 'Ada'
  var int visits = 0
  bind txt greeting = 'Hello, $name (visit ${visits + 1})'

  Scaffold(
    .body(Column(
      .config(gap: 12, padding: all(24))
      Text(.config(type: h2) .obj(greeting))
      Input(.config(label: 'Name', value: name) .fnc { name = value })
      Button(.preset(default) .config(label: 'Visit') .fnc { visits++ })
    ))
  )
)
```

## Where state lives

| Declared in | Lives |
|---|---|
| A file (outside any Page or Widget) | For the whole app, shared everywhere |
| A Page | For the session: kept when you navigate away and back. `.state(reset)` makes it start fresh on each visit |
| A Widget | One copy per instance, for as long as the instance is shown |
| A Function | For one call |

Because page state is kept, other pages can [Extract](/docs/export-extract-inject) it even when that page is not on screen.

## Types

`int num txt bool color paint len size insets align axis time obj list<T> map<K, V> any`, plus `T?` for values that may be empty. A declaration without a type (`var index = 0`) takes the type of its value.

## `!mut`

`!mut` marks something that must never change from outside its owner. The compiler rejects any Export/Extract/Inject write to it (L3101); at runtime such writes are ignored with a warning.
