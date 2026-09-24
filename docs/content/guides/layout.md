---
title: Layout and adaptation
description: fixed, hug and fill sizing, the layout primitives, and how LAYR adapts when space runs out.
order: 31
---

# Layout and adaptation

## Sizing: fixed, hug, fill

Every object's width and height is one of:

| Size | Meaning |
|---|---|
| a length (`200`, `50%`, `12px`) | fixed |
| `hug` (the default) | fit the content |
| `fill` | share the space left over in the parent, by `flex` weight |

These are the same three modes as Figma auto layout, so designs translate directly. Add `minW`, `maxW`, `minH`, `maxH` and `aspect` as needed.

```layr
Row(
  .config(w: fill, gap: 12)
  Container(.config(w: 200, h: 80, color: #ff6a3d))
  Container(.config(w: fill, h: 80, color: #9b8cff))
  Container(.config(w: fill, h: 80, color: #2ed3c4, flex: 2))
)
```

`fill` only means something where there is space to share: `fill` on the axis of a scroll area is a compile error (L2001).

## Primitives

| Widget | Lays out |
|---|---|
| `Container` | one object, with size, paint, border, corners, shadow, padding; `objAlign` places the object |
| `Row`, `Column` | objects along an axis; `xAlign` and `yAlign` mean horizontal and vertical in both |
| `Stack` | objects on top of each other; `Order(.pos(n))` sets layers |
| `Position` | offsets an object in a Stack (`x`, `y`, or `top`/`right`/`bottom`/`left`, negatives allowed) |
| `Mid`, `Align` | fill the parent and place the object in the middle or at an alignment |
| `Expand` | makes its object fill the remaining space |
| `Gap` | fixed space: `Gap(24)` |
| `Wrap`, `Grid` | wrapping rows; grids with fixed columns or a minimum item width |
| `Scroll`, `Aspect`, `SafeArea` | scrolling, aspect ratio, device safe areas |

`xAlign`/`yAlign` values: `start`, `mid`, `end`, `between`, `around`, `evenly`, `stretch`.

## When space runs out

By default (`overflow: auto`) a Row adapts in a fixed order:

1. **Shrink.** Flexible content shrinks toward its minimum; text wraps. Set `shrink: 0` on a child to keep it whole, or a lower number to make it give way first.
2. Then, by what the row holds:
   - **Only `hug` children** (chips, buttons, links): the row **wraps** onto new lines.
   - **Any `fill` or `Expand` child** (content panes): the row **stacks** into a column, and returns to a row when it fits again.
3. **Clip with a warning** (L2101) only when nothing can adapt, such as a fixed child wider than a fixed parent.

A Column with a fixed height scrolls when its content is taller.

```layr
Page(
  .name(Adaptive)
  Scaffold(
    .body(Column(
      .config(w: fill, gap: 16, padding: all(16))
      Row(
        .config(gap: 8)
        Text('alpha')
        Text('bravo')
        Text('charlie')
        Text('delta')
        Text('echo')
      )
      Row(
        .config(w: fill, gap: 16)
        Container(.config(w: 280, h: 80, color: #ff6a3d))
        Container(.config(w: fill, h: 80, minW: 240, color: #9b8cff))
      )
    ))
  )
)
```

Choose explicitly with `overflow: wrap | stack | scroll | clip | shrink | warn | error`, per frame with `.at(m, overflow: scroll)`, or pick between whole layouts with `Adapt`:

```layr
Adapt(
  Row(
    .config(gap: 24)
    Text('Home')
    Text('Docs')
    Text('Library')
    Text('Blog')
  )
  Text('Menu')
)
```

`Adapt` shows the first candidate whose natural width fits.
