---
title: Design Scale
description: Design in your design tool's pixels; LAYR fits every screen. Frames, ds units, interpolation, fonts and accessibility.
order: 32
---

# Design Scale

Write the numbers from your design. `200` means 200 pixels **of your design frame**, and LAYR fits it to the screen: no media queries, no `rem`, `vw` or `clamp()` arithmetic.

## One number, every screen

The bar below is `w: 240`: 240 pixels of the design. It reports its real width in screen pixels:

```layr
Page(
  .name(Scale)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 12, padding: all(24))
      Container(
        .id(bar)
        .config(
          w: 240
          h: 44
          color: accent
          cornerRadius: 10
          objAlign: midLeft
          padding: sym(x: 14)
        )
        .obj(Text(.config(color: onAccent, weight: semibold) .obj('w: 240')))
      )
      Text(
        .config(color: muted)
        .obj('On this screen: ${Math.round(Scale.bar.size?.w ?? 0)} px wide')
      )
    ))
  )
)
```

`Scale.bar.size` is the bar's **rendered** size, measured after layout (see [Extract](/docs/export-extract-inject)). It is empty for the first moment, before anything is measured, which is what `?.` and `?? 0` cover.

> **Try it**
> - Press **m**, **t** and **w** in the result bar. Each is exactly its frame's design width (390, 834, 1440), so the bar is exactly 240 screen pixels at each.
> - Now drag the corner slowly from narrow to wide and watch the number. Between frames the bar follows the screen, but never below 0.9 or above 1.15 times its design size (216 to 276 here). At 600 the tablet frame takes over, and from there the bar is measured against the 834-wide tablet design instead.

## Frames

A frame is a design size and the screen width where it starts. The defaults:

| Frame | Design size | From |
|---|---|---|
| `m` | 390 × 844 | 0 |
| `t` | 834 × 1194 | 600 px |
| `w` | 1440 × 900 | 1024 px |
| `uw` | 2560 × 1080 | 1920 px |

Set yours in `src/app.layr` to match your design files:

```layr
App(
  .scale(DesignScale(
    .m(w: 375, h: 812)
    .w(w: 1280, h: 800)
    .config(min: 0.9, max: 1.2)
  ))
)
```

`.frame(name, w:, h:, from:)` adds a custom frame. `.config(min:, max:)` sets how far a value may scale inside a frame: here between 0.9 and 1.2 times its design size.

## Numbers flow, structure steps

- **One value** (`w: 240`) scales with the screen inside the active frame, within the frame's limits. Phones and tablets use the short side of the screen, so rotating a device does not rescale everything.
- **A value given at several frames** is **interpolated** between the frames' design widths, so it moves smoothly instead of jumping at a breakpoint.
- **Structure** (which widget, direction, overflow mode, visibility) switches at frame boundaries.

```layr
Column(
  .config(gap: 8)
  Text(
    .config(size: 32, weight: bold)
    .at(w, size: 64)
    .obj('32 on phones, 64 on desktop')
  )
  Text(
    .config(color: muted)
    .at(t, step hide: true)
    .obj('This line is only on phones.')
  )
)
```

> **Try it**
> - Drag the corner from narrow to wide: the heading grows smoothly between 32 and 64.
> - Watch the second line: it is structure, so it switches off at the `t` frame instead of fading.

## Fonts and accessibility

Font sizes scale more gently than lengths and keep a `rem` part, so browser zoom and the reader's font-size setting always work. The analyzer warns if a font's largest size is more than 2.5 times its smallest (L6101), which keeps text zoomable to 200% (WCAG 1.4.4).

## Screen pixels and percentages

Use `px` for things that must not scale, such as `borderWidth: 1px`, and `%` for sizes relative to the parent. See [Syntax: numbers are design pixels](/docs/syntax#numbers-are-design-pixels) for the two side by side.

## Components that scale with their space

Wrap an object in `DesignScale(...)` to scale it against the space its parent gives it rather than the screen. A card designed 400 wide renders at half size in a 200-wide slot:

```layr
Row(
  .config(gap: 16, yAlign: start)
  Container(
    .config(w: 200)
    .obj(DesignScale(
      .frame(card, w: 400, h: 300, from: 0)
      .config(min: 0.25, max: 4)
      .obj(Container(
        .config(
          w: 400
          .border(color: line, width: 2)
          color: panel
          cornerRadius: 20
          padding: all(24)
        )
        .obj(Text(.config(size: 28, weight: bold) .obj('Designed at 400')))
      ))
    ))
  )
  Container(
    .config(w: 320)
    .obj(DesignScale(
      .frame(card, w: 400, h: 300, from: 0)
      .config(min: 0.25, max: 4)
      .obj(Container(
        .config(
          w: 400
          .border(color: line, width: 2)
          color: panel
          cornerRadius: 20
          padding: all(24)
        )
        .obj(Text(.config(size: 28, weight: bold) .obj('Designed at 400')))
      ))
    ))
  )
)
```

Both cards are the same 400-wide design, given 200 and 320 of space: each scales to its slot. (Text scales a little more gently than lengths, so it stays readable in the small one.)

## From a design tool

Frames are your design frames, a design pixel is the design tool's pixel, and hug, fill and fixed are auto layout's sizing modes, so a design converts to LAYR almost directly.
