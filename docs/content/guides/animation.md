---
title: Animation
description: Animate interpolates every change to its object, with springs, per-property easing, and enter/exit motion.
order: 33
---

# Animation

Wrap an object in `Animate` and every change to it animates, whatever caused the change: state, a Function, an [Inject](/docs/export-extract-inject), the theme or a frame switch.

```layr
Page(
  .name(Grow)
  var bool big = false
  Scaffold(
    .body(Mid(Column(
      .config(gap: 16, xAlign: mid)
      Animate(
        .eases(w: spring.bounce)
        .obj(Container(
          .id(box)
          .config(w: big ? 320 : 200, h: 120, color: #ff6a3d, cornerRadius: 20)
        ))
      )
      Button(.preset(default) .config(label: 'Toggle') .fnc { big = !big })
    )))
  )
)
```

## Motion

| Key or modifier | Meaning |
|---|---|
| `.eases(w: spring.gentle, color: ease.inOut)` | Motion per property; others use `ease` |
| `.config(ease: spring.snappy)` | Default motion |
| `.config(duration: 300ms)` | Duration for eased (non-spring) motion |
| `.enter(fade, slide(y: 20))` | Motion when the object appears |
| `.exit(fade)` | Motion when it leaves an `If` branch |

Springs: `spring.gentle`, `spring.snappy`, `spring.bounce`, `spring.slow`. Eases: `ease.linear`, `ease.in`, `ease.out`, `ease.inOut`, `ease.emphasized`.

A new change during an animation continues from the current on-screen value. Colour, opacity and transforms run on the compositor.

## Sequences

Steps and TypeScript bodies can pace changes:

```layr
Page(
  .name(Sequence)
  Scaffold(
    .body(Column(
      Animate(
        .obj(Container(.id(animBox) .config(w: 100, h: 100, color: #9b8cff)))
      )
      Button(
        .preset(default)
        .config(label: 'Play')
        .fnc(
          .loop(
            .times(2)
            .exe(animBox.w = 200)
            .wait(300ms)
            .exe(animBox.w = 100)
            .wait(300ms)
          )
        )
      )
    ))
  )
)
```

## Reduced motion

LAYR respects the reader's reduced-motion setting: changes apply instantly. `motion: always` on an `Animate` overrides this for motion that carries meaning.
