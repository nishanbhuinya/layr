---
title: Migrating from v1
description: From @dynshift/layr 1.x React components to LAYR v3.
order: 43
---

# Migrating from v1

LAYR 1.x was a set of Flutter-style React components. LAYR 3 is a compiled language; v2 was never released. v1 keeps working: it stays on npm under the `v1` tag (`npm i @dynshift/layr@v1`) and its source is on the `v1` branch.

## Two ways forward

**Keep your React app and switch component by component.** `@dynshift/layr/tsx` has the core widgets as React components:

| v1 | v3 TSX |
|---|---|
| `<Container width={200} height={100} color="#1a1a1a" decoration={{ borderRadius: 12 }}>` | `<Container w={200} h={100} color="#1a1a1a" cornerRadius={12}>` |
| `<Column spacing={16} mainAxisAlignment={MainAxisAlignment.center}>` | `<Column gap={16} yAlign="mid">` |
| `<Row crossAxisAlignment={CrossAxisAlignment.start}>` | `<Row yAlign="start">` |
| `<SizedBox height={20} />` | `<Gap>{20}</Gap>` |
| `<Padding padding={16}>` | `padding={16}` on the parent |
| `<Centre>` | `<Mid>` |
| `<Positioned top={10} left={10}>` | `<Position top={10} left={10}>` |

Numbers are now design pixels: they scale with the screen. Where v1 relied on exact pixels, pass `px(12)` (from `@dynshift/layr/runtime`) in TSX, or write `12px` in `.layr`.

**Move pages to `.layr`.** New pages get the compiler's checks, static CSS, Design Scale interpolation and Export/Extract/Inject. `.layr` files import into your React app through the Vite plugin, so both can live side by side.

## Naming

- `x` and `y` now mean position and axis; sizes are `w`, `h` and `size`.
- `xAlign` is always horizontal and `yAlign` always vertical, in Rows and Columns alike.
- `Centre`/`Center` is `Mid`; `SizedBox` is `Gap`; `Expanded` is `Expand`.
