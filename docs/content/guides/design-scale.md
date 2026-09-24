---
title: Design Scale
description: Design in your design tool's pixels; LAYR fits every screen. Frames, ds units, interpolation, fonts and accessibility.
order: 32
---

# Design Scale

Write the numbers from your design. `200` means 200 pixels **of your design frame**, and LAYR scales it to the screen with no media queries and no `rem`/`vw`/`clamp()` arithmetic.

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

`.frame(name, w:, h:, from:)` adds a custom frame. `.config(min:, max:)` sets how far values may scale inside a frame.

## Numbers flow, structure steps

- **One value** (`w: 200`) scales proportionally inside the active frame, within the frame's limits. Phones and tablets use the short side of the screen, so rotating a device does not rescale everything.
- **A value given at several frames** (`w: 200` and `.at(w, w: 480)`) is **interpolated** between the frames' design widths instead of jumping at a breakpoint.
- **Structure** (which widget, direction, overflow mode, visibility) switches at frame boundaries.

```layr
Text(
  .config(size: 32, weight: bold)
  .at(w, size: 56)
  .obj('Scales smoothly from 32 to 56')
)
```

## Fonts and accessibility

Font sizes scale more gently than lengths and keep a `rem` part, so browser zoom and the reader's font-size setting always work. The analyzer warns if a font's largest size exceeds 2.5× its smallest (L6101), which keeps text zoomable to 200% (WCAG 1.4.4).

## Absolute units

Use `px` for things that must not scale, such as `borderWidth: 1px`, and `%` for sizes relative to the parent.

## Components that scale with their space

Wrap an object in `DesignScale(...)` to scale it against the space its parent gives it rather than the screen. A card designed at 400 wide renders at half size in a 200-wide slot:

```layr
Container(
  .config(w: 200)
  .obj(DesignScale(
    .frame(card, w: 400, h: 300, from: 0)
    .config(min: 0.25, max: 4)
    .obj(Container(.config(w: 400, h: 40, color: #ff6a3d)))
  ))
)
```

## From a design tool

Frames are your design frames, `ds` is the design tool's pixel, and hug/fill/fixed are auto layout's sizing modes, so a design converts to LAYR almost directly.
