---
title: Export, Extract, Inject
description: Read and change any object's features from anywhere, as reversible, ordered layers the compiler checks.
order: 34
---

# Export, Extract, Inject

Any part of a LAYR app can **read** (Extract) and **change** (Inject) the features of any object in any page or widget. Changes are layers: ordered, reversible, and known to the compiler.

## Protected by default

Objects are protected: nothing outside an object's owner changes its params or features. An Extract or Inject is the explicit way in, and using one is what makes a feature changeable. Mark anything that must never change from outside with `!mut`.

## Addressing objects

By **id**:

```layr noexec
SomePage.card // the object with .id(card) in SomePage

Card.frame // .id(frame) inside the Card widget: every instance

card // an id in the same Page or Widget
```

By **lookup path**, one level per `.`, using the lowercase widget name, a slot name or an id:

```layr noexec
DemoPage.scaffold.body.mid.column.text // the only Text in that Column

DemoPage.scaffold.body.mid.column.text(1) // the second of several Texts (zero-based)

SomePage.card.column.text(0) // mix ids and paths
```

A path continues **into a widget instance**: past the instance, it names objects inside that widget, so it reaches one instance and leaves the others alone. Naming the widget's root is optional, since the instance is its root:

```layr noexec
Room.scaffold.body.column.booking(1).text(0) // the first Text in the second Booking only

Room.scaffold.body.column.booking(1).row.text(0) // the same object, naming Booking's root Row

Booking.row.text(0) // from the widget's definition: that Text in every Booking
```

The compiler resolves every address. A path that breaks after an edit is an error (L3301), and a bare name with several matches is ambiguous (L3303) with fixes listing the `(n)` choices. Ids survive edits; paths are handy for objects you did not name.

## Extract: read

```layr
Page(
  .name(Reader)
  Extract(.from(Source.card) insets pad = card.padding)
  Extract(.from(Source.card) .exeOrder(-1) insets original = card.padding)
  Scaffold(
    .body(Column(
      Text('now: $pad')
      Text('before any Inject: $original')
      Text('rendered size: ${Source.card.size}')
    ))
  )
)

Page(
  .name(Source)
  Scaffold(
    .body(Container(.id(card) .config(color: #ff6a3d, padding: all(10))))
  )
)
```

Extracts are reactive: they update when the feature changes. Features are config keys (`padding`, `w`, `color`…), widget params, and the **rendered** features `size`, `pos` and `visible`, measured from layout and read-only. `.exeOrder(k)` reads the value **below** that point in the cascade: `.exeOrder(-1)` sees it before any Inject.

Inline references (`Source.card.size` in an expression) are Extracts too.

## Inject: change

```layr
Page(
  .name(Target)
  var bool loud = false
  Scaffold(
    .body(Column(
      Container(.id(card) .config(color: #ff6a3d, padding: all(10)))
      Button(.preset(default) .config(label: 'Toggle') .fnc { loud = !loud })
      If(.cnd(loud) .obj(Louder()))
    ))
  )
)

Widget(
  .name(Louder)
  Inject(.into(Target.card) .exeOrder(0) card.padding = card.padding * 2)
  Inject(.into(Target.card) .exeOrder(1) card.color = red)
  .obj(Text('louder'))
)
```

Each Inject is a **layer**: a change applied on top of the value below it. The rules:

- Layers apply in ascending `.exeOrder`. Two Injects on the same feature with the same order are an error (L3102). Injects without an order go after ordered ones, in file order, with a warning if two share a feature (L3103).
- Inside an Inject, the target's current value is the value from the layer below: `card.padding * 2` doubles whatever came before.
- A layer lives as long as its owner: a file-level Inject is permanent, a Page's while it is shown, a Widget's while that instance is shown. When the owner goes away, the layer goes and the value **reverts**.
- Writing a feature from a Function (`card.w = 360`) is the imperative form. It sets the base value; layers still apply above it.

## The cascade

Every feature resolves in one order:

```text
schema default → theme → preset → config → .at(frame) → writes → injections by exeOrder → final
```

Ask the analyzer for any feature's cascade:

```sh
layr analyze --explain Target.card.padding
```

```text
Target::card.padding
  declared (config)
  inject   exeOrder 0  src/pages/target.layr:12:41
  extract  at exeOrder -1  src/pages/reader.layr:3:52
```

In VS Code, **Find References** on an id lists every Extract and Inject of that object.

## `!mut`

```layr
Container(.id(logo) .config(w: 40, !mut color: #0d0d0d))
```

Any Extract/Inject change to a `!mut` feature is an error (L3101); at runtime it is ignored with a warning. For system code that must override it, `Inject(.force ...)` is allowed only in files listed under `access.force` in `layr.yaml`, and the analyzer lists every forced injection.

## Export: name what you share

`.export(...)` gives features names under an export id, like a small public interface for an object:

```layr
Page(
  .name(Shared)
  bind size doubled = boxFeatures.boxSize * 2
  Scaffold(
    .body(Column(
      Container(
        .config(w: 120, h: 30, color: #9b8cff)
        .export(id: boxFeatures, size boxSize = container.size)
      )
      Text('doubled: $doubled')
    ))
  )
)
```

Export is optional: every feature is already reachable by id or path. Use it to name and document what other code should use.

## From React

React code joins the same cascade: `useExtract("Target::card", "padding")` reads a feature and `inject(address, key, order, fn)` adds a layer and returns a function that removes it. See [React interop](/docs/react).
