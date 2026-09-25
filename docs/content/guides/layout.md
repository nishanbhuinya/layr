---
title: Layout and adaptation
description: fixed, hug and fill sizing, the layout primitives, and how LAYR adapts when space runs out.
order: 31
---

# Layout and adaptation

Layout in LAYR comes down to three questions for every object: how wide and tall is it, how are its children arranged, and what happens when there is not enough room. This page answers them in that order.

## Sizing: fixed, hug, fill

Every width and height is one of three kinds:

| Size | Means |
|---|---|
| a length: `200`, `50%`, `12px` | **fixed**: exactly that |
| `hug` (the default) | fit the content |
| `fill` | share the space the parent has left, by `flex` weight |

Each box below says which it is:

```layr
Row(
  .config(w: fill, gap: 12)
  Container(
    .config(w: 200, h: 72, color: ember, cornerRadius: 10, padding: all(12))
    .obj(Text(.config(color: onAccent, weight: semibold) .obj('w: 200')))
  )
  Container(
    .config(w: fill, h: 72, color: violet, cornerRadius: 10, padding: all(12))
    .obj(Text(.config(color: onAccent, weight: semibold) .obj('w: fill')))
  )
  Container(
    .config(
      w: fill
      h: 72
      color: teal
      cornerRadius: 10
      flex: 2
      padding: all(12)
    )
    .obj(Text(.config(color: onAccent, weight: semibold) .obj('w: fill, flex: 2')))
  )
)
```

The first box takes its 200. The other two share what is left, and `flex: 2` takes two shares to the other's one.

> **Try it**
> - Drag the result's corner: only the `fill` boxes change width, until there is no room left and the row stacks (see [When space runs out](#when-space-runs-out)).
> - Change `flex: 2` to `flex: 1`: the two fill boxes become equal.
> - Change the first box's `w: 200` to `w: hug`: it shrinks to fit its label.

These are the same three modes as Figma's auto layout, so a design translates directly. Add `minW`, `maxW`, `minH`, `maxH` and `aspect` when you need limits. `fill` needs space to share: `fill` along a scroll area's axis is a compile error (L2001).

## Arranging: the primitives

| Widget | Lays out |
|---|---|
| `Row`, `Column` | objects along an axis; `xAlign` and `yAlign` mean horizontal and vertical in both |
| `Container` | one object, with size, paint, border, corners, shadow, padding; `objAlign` places the object |
| `Stack` | objects on top of each other; `Order(.pos(n))` sets layers |
| `Position` | offsets an object in a Stack (`x`, `y`, or `top`/`right`/`bottom`/`left`, negatives allowed) |
| `Mid`, `Align` | fill the parent and place the object in the middle or at an alignment |
| `Expand` | makes its object fill the remaining space |
| `Gap` | fixed space: `Gap(24)` |
| `Wrap`, `Grid` | wrapping rows; grids with fixed columns or a minimum item width |
| `Scroll`, `Aspect`, `SafeArea` | scrolling, aspect ratio, device safe areas |

`xAlign` and `yAlign` take `start`, `mid`, `end`, `between`, `around`, `evenly` or `stretch`.

A `Stack` puts objects on top of each other, and `Position` pins one to an edge. A notification badge on a card:

```layr
Stack(
  Container(
    .config(
      w: 220
      .border(color: line, width: 1)
      color: panel
      cornerRadius: 14
      padding: all(20)
    )
    .obj(Column(
      .config(gap: 4)
      Text(.config(weight: semibold) .obj('Inbox'))
      Text(.config(color: muted) .obj('3 unread messages'))
    ))
  )
  Position(
    .config(right: -8, top: -8)
    .obj(Container(
      .config(size: 26, color: accent, cornerRadius: 999, objAlign: mid)
      .obj(Text(.config(size: 13, color: onAccent, weight: bold) .obj('3')))
    ))
  )
)
```

> **Try it**
> - Change `top: -8, right: -8` to `bottom: 12, right: 12`: the badge moves inside the card.
> - Change the Row of boxes above to a `Column`: every `w: fill` now fills the width, one under another.

## When space runs out

Resize a page and something has to give. By default (`overflow: auto`) a Row adapts in a fixed order:

1. **Shrink.** Flexible content shrinks toward its minimum, and text wraps. `shrink: 0` on a child keeps it whole.
2. Then, by what the row holds:
   - **Only `hug` children** (chips, buttons, links): the row **wraps** onto new lines.
   - **A `fill` or `Expand` child** (content panes): the row **stacks** into a column once a pane would be squeezed, and becomes a row again when there is room.
3. **Clip, with a warning** (L2101), only when nothing can adapt, such as a fixed child wider than a fixed parent.

The two rows below show both. Press **m** in the result bar, or drag the corner:

```layr
Column(
  .config(w: fill, gap: 20)
  Text(.config(color: muted) .obj('Only hug children: they wrap'))
  Row(
    .config(gap: 8)
    Container(
      .config(color: sunken, cornerRadius: 999, padding: sym(x: 14, y: 8))
      .obj(Text('Layout'))
    )
    Container(
      .config(color: sunken, cornerRadius: 999, padding: sym(x: 14, y: 8))
      .obj(Text('Design Scale'))
    )
    Container(
      .config(color: sunken, cornerRadius: 999, padding: sym(x: 14, y: 8))
      .obj(Text('Animation'))
    )
    Container(
      .config(color: sunken, cornerRadius: 999, padding: sym(x: 14, y: 8))
      .obj(Text('Export, Extract, Inject'))
    )
  )
  Text(.config(color: muted) .obj('A fill child: the row stacks'))
  Row(
    .config(w: fill, gap: 12)
    Container(
      .config(w: 200, h: 90, color: ember, cornerRadius: 10, padding: all(12))
      .obj(Text(.config(color: onAccent, weight: semibold) .obj('w: 200')))
    )
    Container(
      .config(w: fill, h: 90, color: violet, cornerRadius: 10, padding: all(12))
      .obj(Text(
        .config(color: onAccent, weight: semibold)
        .obj('w: fill: a pane that must not be squeezed')
      ))
    )
  )
)
```

Nothing in that code mentions a screen size. `layr analyze --frames` tells you where each row adapts, and why.

Choose the behaviour yourself with `overflow: wrap | stack | scroll | clip | shrink | warn | error`, per frame with `.at(m, overflow: scroll)`. Or offer whole alternatives with `Adapt`, which shows the first one that fits:

```layr
Adapt(
  Row(
    .config(gap: 24)
    Text('Home')
    Text('Docs')
    Text('Library')
    Text('Blog')
    Text('Community')
    Text('Changelog')
  )
  Text(.config(weight: semibold) .obj('☰ Menu'))
)
```

> **Try it**
> - Press **m**: six links do not fit, so `Adapt` shows the menu instead.
> - Add `.config(overflow: scroll)` to the chips row: it scrolls sideways instead of wrapping.

A `Column` with a fixed height scrolls when its content is taller.
