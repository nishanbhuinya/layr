---
title: Effects
description: Frosted glass, progressive blur that dissolves content toward an edge, and blurring an object's own content.
order: 34
---

# Effects

`Blur` blurs one of two things. With `blurOn: background` (the default) it blurs whatever shows through it from behind: frosted glass. With `blurOn: object` it blurs its own content. Either way the blur is `uniform`, or `progressive`: clear on one side and deepening toward an `edge`.

## Frosted glass

A header that stays readable over anything scrolling under it. The Blur is transparent: its `color` is a thin veil of the page colour, and the blur does the rest. Scroll the feed.

```layr
Page(
  .name(Glass)
  .route('/')
  Scaffold(
    .config(color: #f4efe7)
    .body(Stack(
      .config(w: fill, h: 340, clip: true)
      Scroll(
        .config(w: fill, h: fill)
        Column(
          .config(w: fill, gap: 12, padding: only(left: 16, right: 16, top: 76, bottom: 16))
          Container(.config(w: fill, h: 110, cornerRadius: 14, color: LinearGradient(.colors(#ff6a3d, #ffc46b))))
          Container(.config(w: fill, h: 110, cornerRadius: 14, color: LinearGradient(.colors(#9b8cff, #2ed3c4))))
          Container(.config(w: fill, h: 110, cornerRadius: 14, color: LinearGradient(.colors(#1c1917, #ff6a3d))))
          Container(.config(w: fill, h: 110, cornerRadius: 14, color: LinearGradient(.colors(#2ed3c4, #ffc46b))))
        )
      )
      Position(
        .config(top: 0, left: 0, right: 0)
        .obj(Blur(
          .config(w: fill, value: 16, padding: sym(x: 20, y: 18), color: #fffcf7.alpha(55%))
          .obj(Text(.config(size: 17, weight: semibold, color: #1c1917) .obj('Frosted header')))
        ))
      )
    ))
  )
)
```

## Progressive blur

A progressive blur is clear on one side and strongest at `edge`, so content dissolves instead of stopping at a hard line: the end of a feed, the space under a floating toolbar, the bottom of a hero image.

It is drawn as a stack of thin blur layers, each covering an overlapping band, so no steps show. `curve: exponential` (the default) keeps the clear side clear for longest, which reads as the most natural fade. `extent` sets how far from the edge the blur reaches, and `fade` melts the blurred edge into a colour so text laid over it stays readable.

```layr
Page(
  .name(Dissolve)
  .route('/')
  Scaffold(
    .config(color: #f4efe7)
    .body(Stack(
      .config(w: fill, h: 360, clip: true)
      Column(
        .config(w: fill, gap: 10, padding: all(16))
        Text(.config(size: 13, color: #625a50) .obj('Today'))
        Container(.config(w: fill, h: 72, cornerRadius: 12, color: LinearGradient(.colors(#ff6a3d, #ffc46b))))
        Container(.config(w: fill, h: 72, cornerRadius: 12, color: LinearGradient(.colors(#9b8cff, #6d5ce6))))
        Container(.config(w: fill, h: 72, cornerRadius: 12, color: LinearGradient(.colors(#2ed3c4, #0e9f92))))
        Container(.config(w: fill, h: 72, cornerRadius: 12, color: LinearGradient(.colors(#ffc46b, #e8551f))))
      )
      Position(
        .config(bottom: 0, left: 0, right: 0)
        .obj(Blur(.config(w: fill, h: 180, type: progressive, edge: bottom, value: 28, fade: #f4efe7)))
      )
    ))
  )
)
```

| Key | What it does |
| --- | --- |
| `edge` | The side where the blur is strongest: `bottom`, `top`, `left` or `right`. |
| `value` | The blur radius at the edge. |
| `extent` | How far from the edge it reaches: a length, or a percentage of the Blur (default `100%`). |
| `layers` | How many layers draw it (default 8). More is smoother; 6 to 12 covers almost everything. |
| `curve` | `exponential` (default), `ease` or `linear`. |
| `fade` | A colour the edge melts into, usually the page background. |

## Blurring an object's own content

`blurOn: object` blurs what is inside the Blur. Its `value` is animatable: wrap it in `Animate` and change it, and the content comes into focus.

```layr
Page(
  .name(Spoiler)
  .route('/')
  var bool hidden = true
  Scaffold(
    .config(color: #f4efe7)
    .body(Column(
      .config(w: fill, gap: 16, padding: all(24))
      Animate(
        .config(duration: 450ms, ease: ease.out)
        .obj(Blur(
          .config(blurOn: object, value: hidden ? 10 : 0, padding: all(20), cornerRadius: 12, color: #fffcf7)
          .obj(Text(.config(size: 18, color: #1c1917, lineHeight: 1.5) .obj('The layout was authoritative all along: every number in the file was the one on the screen.')))
        ))
      )
      Button(.preset(default) .config(label: hidden ? 'Reveal the ending' : 'Hide it again') .fnc { hidden = !hidden })
    ))
  )
)
```

Blur is drawn by the browser's compositor (`backdrop-filter` and `filter`). A few blurred areas cost little; a full-screen progressive blur over video, with many layers, is the expensive end.
