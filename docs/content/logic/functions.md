---
title: Functions and events
description: Named actions written as SAPI steps or TypeScript, and how objects run them.
order: 21
---

# Functions and events

A `Function` is a named, typed action. Write its body as **SAPI steps** or as **TypeScript**; both compile to the same thing and can be mixed.

```layr
Page(
  .name(Steps)
  var int count = 0

  // SAPI steps
  Function(
    .name(step)
    .param(ref int n)
    .def(.if(.cnd(n >= 9) .exe(n = 0)) .fb(.exe(n++)))
  )

  // TypeScript
  Function(.name(reset) .param(ref int n) .def { n = 0 })

  Scaffold(
    .body(Row(
      .config(gap: 8, padding: all(24))
      Text('$count')
      Button(.preset(default) .config(label: 'Step') .fnc(step(count)))
      Button(.preset(default) .config(label: 'Reset') .fnc(reset(count)))
    ))
  )
)
```

## Params

`ref int n` receives the caller's state itself, so assigning `n` changes the caller's `count`. Without `ref`, a param is a value.

## SAPI steps

| Step | Meaning |
|---|---|
| `.if(.cnd(test) steps…)` | Adjacent `.if`s form a chain: the first whose test is true runs |
| `.fb(steps…)` | Runs when no `.if` in the chain matched |
| `.exe(statement)` or `.exe { ts }` | Runs a statement |
| `.wait(100ms)` | Pauses the action |
| `.loop(steps…)` | Repeats while the object that started it is shown; add `.times(n)` or `.while(test)` |
| `.call(f(args))` | Calls a Function |
| `.go(Page, key: value)` | Navigates |

The analyzer reports conditions in a chain that can never run.

## TypeScript bodies

Inside `{ }` you write TypeScript. LAYR state reads and writes like plain variables, and LAYR literals work: `200ds`, `12px`, `300ms`, `#ff0000`, `await 100ms`.

```layr
Page(
  .name(Pulse)
  var bool on = false
  Function(
    .name(blink)
    .def {
      for (let i = 0; i < 3; i++) {
        on = !on
        await 200ms
      }
    }
  )
  Scaffold(
    .body(Button(.preset(default) .config(label: on ? 'On' : 'Off') .fnc(blink)))
  )
)
```

Writing another object's feature (`card.w = 360`) is an imperative [Inject](/docs/export-extract-inject).

## Events

`.fnc(action)` runs the widget's **primary action**: a Button or Link press, an Input/Toggle/Select/Slider change (the new value is `value`), a Form submit. `.on(event: action)` handles the rest:

```layr
Container(
  .config(size: 80, color: #ff6a3d)
  .on(
    hover: { print('in') }
    hoverEnd: { print('out') }
    mount: { print('shown') }
  )
)
```

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `mount`, `unmount`, plus `change`/`submit` on inputs and `close` on overlays. Any object with `.fnc` becomes keyboard accessible (Enter and Space).

Actions stop cleanly when the object that started them goes away: waits and loops end instead of running in the background.
