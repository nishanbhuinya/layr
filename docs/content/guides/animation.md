---
title: Animation
description: Animate interpolates every change to its object, with springs, per-property easing, and enter/exit motion.
order: 33
---

# Animation

Wrap an object in `Animate` and every change to it moves instead of jumping, whatever caused the change: state, a Function, an [Inject](/docs/export-extract-inject), the theme, or a frame switch.

```layr
Page(
  .name(Grow)
  .route('/')
  var bool big = false
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 16, padding: all(24))
      Animate(
        .eases(w: spring.bounce)
        .obj(Container(
          .config(
            w: big ? 320 : 160
            h: 96
            color: big ? violet : accent
            cornerRadius: big ? 28 : 12
            padding: all(16)
          )
          .obj(Text(
            .config(color: onAccent, weight: semibold)
            .obj(big ? 'w: 320' : 'w: 160')
          ))
        ))
      )
      Button(.preset(default) .config(label: 'Toggle') .fnc { big = !big })
    ))
  )
)
```

The width, the corners and the colour all change in one step, and `Animate` moves each from where it is to where it is going. `.eases(w: spring.bounce)` gives the width its own motion; everything else uses the default.

> **Try it**
> - Press **Toggle** twice quickly. The second change starts from wherever the first had got to, instead of restarting: springs keep their speed.
> - Remove the whole `Animate(...)` wrapper, leaving the `Container`: the same changes now jump.

## Choosing a motion

Springs feel physical: they have no fixed duration and settle when they settle. One button moves all four bars below, each with a different spring:

```layr
Page(
  .name(Springs)
  .route('/')
  var bool on = false
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(w: fill, gap: 10, padding: all(24))
      Button(.preset(default) .config(label: 'Move all four') .fnc { on = !on })
      Animate(
        .config(ease: spring.gentle)
        .obj(Container(
          .config(
            w: on ? 300 : 120
            h: 36
            color: ember
            cornerRadius: 8
            objAlign: midLeft
            padding: sym(x: 12)
          )
          .obj(Text(.config(color: onAccent) .obj('gentle')))
        ))
      )
      Animate(
        .config(ease: spring.snappy)
        .obj(Container(
          .config(
            w: on ? 300 : 120
            h: 36
            color: gold
            cornerRadius: 8
            objAlign: midLeft
            padding: sym(x: 12)
          )
          .obj(Text(.config(color: ink) .obj('snappy')))
        ))
      )
      Animate(
        .config(ease: spring.bounce)
        .obj(Container(
          .config(
            w: on ? 300 : 120
            h: 36
            color: teal
            cornerRadius: 8
            objAlign: midLeft
            padding: sym(x: 12)
          )
          .obj(Text(.config(color: onAccent) .obj('bounce')))
        ))
      )
      Animate(
        .config(ease: spring.slow)
        .obj(Container(
          .config(
            w: on ? 300 : 120
            h: 36
            color: violet
            cornerRadius: 8
            objAlign: midLeft
            padding: sym(x: 12)
          )
          .obj(Text(.config(color: onAccent) .obj('slow')))
        ))
      )
    ))
  )
)
```

For motion with a fixed length, use an ease and a duration: `.config(ease: ease.out, duration: 200ms)`. Small, frequent UI changes (a hover, a toggle) want short, snappy motion; large movements that explain something can take longer.

| Key or modifier | Meaning |
|---|---|
| `.config(ease: spring.snappy)` | The motion for every property |
| `.eases(w: spring.gentle, color: ease.inOut)` | Motion per property |
| `.config(duration: 300ms)` | The duration for eased (non-spring) motion |
| `.enter(fade, slide(y: 20))` | Motion when the object appears |
| `.exit(fade)` | Motion when it leaves an `If` branch |

Springs: `spring.gentle`, `spring.snappy`, `spring.bounce`, `spring.slow`. Eases: `ease.linear`, `ease.in`, `ease.out`, `ease.inOut`, `ease.emphasized`.

## Entering and leaving

An object inside `If` appears and disappears. `.enter(...)` and `.exit(...)` give it motion on the way in and out, and the outgoing branch finishes its exit before it is removed:

```layr
Page(
  .name(Toast)
  .route('/')
  var bool shown = false
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 16, padding: all(24))
      Button(
        .preset(default)
        .config(label: shown ? 'Dismiss' : 'Save')
        .fnc { shown = !shown }
      )
      If(
        .cnd(shown)
        .obj(Animate(
          .config(duration: 220ms, ease: ease.out)
          .enter(fade, slide(y: 12))
          .exit(fade)
          .obj(Container(
            .config(
              .border(color: line, width: 1)
              color: panel
              cornerRadius: 12
              padding: sym(x: 16, y: 12)
            )
            .obj(Text('Saved. Your changes are live.'))
          ))
        ))
      )
    ))
  )
)
```

> **Try it**
> - Change `slide(y: 12)` to `slide(y: -12)`: it now drops in from above.
> - Remove `.exit(fade)`: it still arrives smoothly, but leaves at once.

## Sequences

Steps and TypeScript bodies can pace changes over time. Here one action plays a small routine:

```layr
Page(
  .name(Sequence)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 16, padding: all(24))
      Animate(
        .config(ease: spring.snappy)
        .obj(Container(
          .id(box)
          .config(w: 80, h: 80, color: accent, cornerRadius: 16)
        ))
      )
      Button(
        .preset(default)
        .config(label: 'Play')
        .fnc(
          .loop(
            .times(2)
            .exe(box.w = 240)
            .wait(300ms)
            .exe(box.w = 80)
            .wait(300ms)
          )
        )
      )
    ))
  )
)
```

`box.w = 240` writes the box's width from an action, and `Animate` moves it there. See [Functions and events](/docs/functions) for every step.

## Reduced motion

LAYR respects the reader's reduced-motion setting: changes apply instantly. `motion: always` on an `Animate` overrides this for motion that carries meaning.
