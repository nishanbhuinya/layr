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
  .config(
    w: fill
    gap: 12
  )
  Container(
    .config(
      w: 200
      h: 72
      color: ember
      cornerRadius: 10
      padding: all(12)
    )
    .obj(
      Text(
        .config(
          color: onAccent
          weight: semibold
        )
        .obj('w: 200')
      )
    )
  )
  Container(
    .config(
      w: fill
      h: 72
      color: violet
      cornerRadius: 10
      padding: all(12)
    )
    .obj(
      Text(
        .config(
          color: onAccent
          weight: semibold
        )
        .obj('w: fill')
      )
    )
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
    .obj(
      Text(
        .config(
          color: onAccent
          weight: semibold
        )
        .obj('w: fill, flex: 2')
      )
    )
  )
)
```

The first box takes its 200. The other two share what is left, and `flex: 2` takes two shares to the other's one.

> **Try it**
> - Drag the result's corner: only the `fill` boxes change width, until there is no room left and the row stacks (see [When space runs out](#when-space-runs-out)).
> - Change `flex: 2` to `flex: 1`: the two fill boxes become equal.
> - Change the first box's `w: 200` to `w: hug`: it shrinks to fit its label.

These are the same three modes as Figma's auto layout, so a design translates directly. Add `minW`, `maxW`, `minH`, `maxH` and `aspect` when you need limits. `fill` needs space to share: `fill` along a scroll area's axis is a compile error (L2001).

`hug` holds everywhere, including directly in a Scaffold's body: a Container there is as wide as its content until you give it `w: fill`. The body arranges its objects like a Column.

### Computing with hug and fill

`hug` and `fill` are sizes too, worked out by layout, and arithmetic on them is a size worked out from them: `w: hug + 24` is as wide as the content plus 24, and `w: fill - 40` takes its share of the row less 40. A size that nothing changes stays plain `hug` or `fill`; one that is changed keeps being worked out from them. When the label gets longer, `hug + 24` is still 24 wider than the new label, and a Row of such boxes still wraps, shrinks and stacks the way a Row of hugging or filling boxes does.

This is how a button grows when pressed, with no size of its own written anywhere:

```layr
Page(
  .name(Press)
  .route('/')
  var bool press = false
  Inject(
    .into(Press.pill)
    pill.w = press ? pill.w + 16 : pill.w
    pill.h = press ? pill.h + 8 : pill.h
  )

  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(
          w: fill
          gap: 16
          padding: all(24)
        )
        Animate(
          Container(
            .id(pill)
            .config(
              color: accent
              cornerRadius: 20
              padding: sym(x: 14, y: 6)
            )
            .on(tap: press = !press)
            Text('Press me')
          )
        )
        Row(
          .config(
            w: fill
            gap: 8
          )
          Container(
            .config(
              w: hug + 24
              color: panel
              cornerRadius: 6
            )
            Text('hug + 24')
          )
          Container(
            .config(
              w: fill - 40
              color: panel
              cornerRadius: 6
            )
            Text('fill - 40')
          )
        )
      )
    )
  )
)
```

Inside an Inject, `pill.w` on the right is the size the object had before this Inject: here, its hugged width. So the pill is its hugged size plus 16 while pressed, and animates there.

> **Try it**
> - Press the pill, then change `'Press me'` to a longer label: it still hugs the label, 16 wider.
> - Change `pill.w + 16` to `pill.w * 1.5`.

Another object's `hug` or `fill` size in arithmetic is the size it was laid out at, the same as its measured `card.size.w`. A size times a size, or anything divided by a size, is not a length: that is the one error (L2004).

## Arranging: the primitives

| Widget | Lays out |
|---|---|
| `Row`, `Column` | objects along an axis; `xAlign` and `yAlign` mean horizontal and vertical in both |
| `Container` | one object, with size, paint, border, corners, shadow, padding; `objAlign` places the object |
| `Stack` | objects on top of each other; `Order(.posOrder(n))` sets layers |
| `Position` | pins an object to the edges of its box (`top`/`right`/`bottom`/`left`, negatives allowed) or offsets it (`x`, `y`) |
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
      color: panel
      cornerRadius: 14
      padding: all(20)
      .border(
        color: line
        width: 1
      )
    )
    .obj(
      Column(
        .config(gap: 4)
        Text(
          .config(weight: semibold)
          .obj('Inbox')
        )
        Text(
          .config(color: muted)
          .obj('3 unread messages')
        )
      )
    )
  )
  Position(
    .config(
      right: -8
      top: -8
    )
    .obj(
      Container(
        .config(
          size: 26
          color: accent
          cornerRadius: 999
          objAlign: mid
        )
        .obj(
          Text(
            .config(
              size: 13
              color: onAccent
              weight: bold
            )
            .obj('3')
          )
        )
      )
    )
  )
)
```

> **Try it**
> - Change `right: -8, top: -8` to `bottom: 12, right: 12`: the badge moves inside the card.
> - Change the Row of boxes above to a `Column`: every `w: fill` now fills the width, one under another.

A Position pins to its **box**: the nearest Container, Stack, Scroll or Grid around it. Rows and Columns arrange their objects, but they are not a frame to pin to. So a Position inside a Column inside a card pins to the card's corners, not to the page's.

```layr
Container(
  .config(
    w: 260
    h: 140
    color: panel
    cornerRadius: 12
    padding: all(16)
  )
  Column(
    .config(gap: 4)
    Text(
      .config(weight: semibold)
      .obj('Order #2041')
    )
    Text(
      .config(color: muted)
      .obj('Packed, ships today')
    )
    Position(
      .config(
        bottom: 12
        right: 12
      )
      Text(
        .config(
          color: accent
          weight: semibold
        )
        .obj('Track →')
      )
    )
  )
)
```

> **Try it**
> - Change `bottom: 12` to `top: 12`: the link moves to the card's top-right corner.

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
  .config(
    w: fill
    gap: 20
  )
  Text(
    .config(color: muted)
    .obj('Only hug children: they wrap')
  )
  Row(
    .config(gap: 8)
    Container(
      .config(
        color: sunken
        cornerRadius: 999
        padding: sym(x: 14, y: 8)
      )
      .obj(Text('Layout'))
    )
    Container(
      .config(
        color: sunken
        cornerRadius: 999
        padding: sym(x: 14, y: 8)
      )
      .obj(Text('Design Scale'))
    )
    Container(
      .config(
        color: sunken
        cornerRadius: 999
        padding: sym(x: 14, y: 8)
      )
      .obj(Text('Animation'))
    )
    Container(
      .config(
        color: sunken
        cornerRadius: 999
        padding: sym(x: 14, y: 8)
      )
      .obj(Text('Export, Extract, Inject'))
    )
  )
  Text(
    .config(color: muted)
    .obj('A fill child: the row stacks')
  )
  Row(
    .config(
      w: fill
      gap: 12
    )
    Container(
      .config(
        w: 200
        h: 90
        color: ember
        cornerRadius: 10
        padding: all(12)
      )
      .obj(
        Text(
          .config(
            color: onAccent
            weight: semibold
          )
          .obj('w: 200')
        )
      )
    )
    Container(
      .config(
        w: fill
        h: 90
        color: violet
        cornerRadius: 10
        padding: all(12)
      )
      .obj(
        Text(
          .config(
            color: onAccent
            weight: semibold
          )
          .obj('w: fill: a pane that must not be squeezed')
        )
      )
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
  Text(
    .config(weight: semibold)
    .obj('☰ Menu')
  )
)
```

> **Try it**
> - Press **m**: six links do not fit, so `Adapt` shows the menu instead.
> - Add `.config(overflow: scroll)` to the chips row: it scrolls sideways instead of wrapping.

A `Column` with a fixed height scrolls when its content is taller.
