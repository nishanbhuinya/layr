---
title: Functions and events
description: Named actions written as SAPI steps or TypeScript, and how objects run them.
order: 21
---

# Functions and events

A `Function` is a named action. Write its body as **SAPI steps** (LAYR's own step language) or as **TypeScript**: both compile to the same thing and can be mixed in one file.

```layr
Page(
  .name(Steps)
  .route('/')
  var int count = 0

  // SAPI steps: count up to 9, then wrap to 0
  Function(
    .name(step)
    .param(ref int n)
    .def(.if(.cnd(n >= 9) .exe(n = 0)) .fb(.exe(n++)))
  )

  // The same idea in TypeScript
  Function(.name(reset) .param(ref int n) .def { n = 0 })

  Scaffold(
    .config(color: canvas)
    .body(Row(
      .config(gap: 12, padding: all(24), yAlign: mid)
      Text(.config(size: 32, weight: bold) .obj('$count'))
      Button(.preset(default) .config(label: 'Step') .fnc(step(count)))
      Button(.preset(default) .config(label: 'Reset') .fnc(reset(count)))
    ))
  )
)
```

`.fnc(step(count))` calls the Function when the button is pressed. `ref int n` means the Function receives the caller's `count` itself, so assigning `n` changes `count`. Without `ref`, a param is a plain value.

> **Try it**
> - Press **Step** ten times: it wraps from 9 to 0.
> - Change `n >= 9` to `n >= 3`.
> - Rewrite `step` in TypeScript: `.def { n = n >= 9 ? 0 : n + 1 }`. Same behaviour.

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

Inside `{ }` you write TypeScript. LAYR state reads and writes like plain variables, and LAYR literals work too: `200ds`, `12px`, `300ms`, `#ff0000`, and `await 100ms` to wait.

```layr
Page(
  .name(Pulse)
  .route('/')
  var bool on = false
  Function(
    .name(blink)
    .def {
      for (let i = 0; i < 6; i++) {
        on = !on
        await 200ms
      }
    }
  )
  Scaffold(
    .config(color: canvas)
    .body(Row(
      .config(gap: 16, padding: all(24), yAlign: mid)
      Container(
        .config(size: 40, color: on ? accent : sunken, cornerRadius: 999)
      )
      Button(.preset(default) .config(label: 'Blink three times') .fnc(blink))
    ))
  )
)
```

> **Try it**
> - Change `200ms` to `60ms`.
> - Wrap the circle in `Animate(...)` (see [Animation](/docs/animation)) so each change fades instead of snapping.

Writing another object's feature (`card.w = 360`) is an imperative [Inject](/docs/export-extract-inject).

## Events

`.fnc(action)` runs the widget's **primary action**: a Button or Link press, an Input, Toggle, Select or Slider change (the new value is `value`), a Form submit. `.on(event: action)` handles the rest:

```layr
Page(
  .name(Hover)
  .route('/')
  var bool over = false
  var int taps = 0
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 12, padding: all(24))
      Container(
        .config(
          w: 220
          .border(color: line, width: 1)
          color: over ? accent : panel
          cornerRadius: 14
          padding: all(20)
        )
        .on(hover: { over = true }, hoverEnd: { over = false }, tap: { taps++ })
        .obj(Text(
          .config(color: over ? onAccent : ink)
          .obj(over ? 'Pointer inside' : 'Point at me')
        ))
      )
      Text(.config(color: muted) .obj('Tapped $taps times'))
    ))
  )
)
```

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `mount`, `unmount`, plus `change`/`submit` on inputs and `close` on overlays. Any object with `.fnc` becomes keyboard accessible (Enter and Space).

Actions stop cleanly when the object that started them goes away: waits and loops end instead of running in the background.
