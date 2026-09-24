---
title: Troubleshooting
description: Common problems and how LAYR tells you about them.
order: 44
---

# Troubleshooting

Every diagnostic has a code. `layr explain <code>` prints the explanation; the [errors reference](/errors) lists them all.

**"Unknown config key" (L1002).** The message suggests the closest key, including aliases (`widht` → `w`). In VS Code, the quick fix applies it.

**An object is 0 × 0.** A `hug` Container with no child has nothing to hug (L2003). Give it a size.

**`fill` does nothing, or L2001.** `fill` shares space its parent has spare. In a scroll area there is no end to share; give the object a length.

**A row wraps or stacks unexpectedly.** That is [adaptation](/docs/layout#when-space-runs-out). Set `overflow` explicitly, or give children `shrink` values.

**An Inject has no effect.** Check `layr analyze --explain Page.id.feature`: another layer with a higher `exeOrder` may override it, the feature may be `!mut` (L3101), or the Inject's owner may not be shown (its layer only exists while it is).

**Two Injects conflict (L3102).** Give them different `.exeOrder` values.

**A lookup path broke (L3301) or is ambiguous (L3303).** Paths follow the object tree; after restructuring, update the path or give the object an `.id`.

**Text does not grow with browser zoom.** It does: LAYR fonts keep a `rem` part. If you see L6101, a font's range across frames is too wide.

**Hydration warnings after `layr build`.** Values that depend on the screen at runtime (not in CSS) can differ from the prerendered HTML. Prefer `.at(frame, ...)`, which compiles to CSS.

**`layr test` fails after a deliberate change.** Look at `tests/frames/*.diff.png`, then accept with `layr test --update`.
