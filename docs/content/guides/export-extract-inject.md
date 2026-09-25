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

An Extract reads a feature of another object. Here a page reads its own card three ways: the padding now, the padding before any Inject, and the size it rendered at:

```layr
Page(
  .name(Reader)
  .route('/')
  Extract(.from(Reader.card) insets pad = card.padding)
  Extract(.from(Reader.card) .exeOrder(-1) insets original = card.padding)
  Inject(.into(Reader.card) .exeOrder(0) card.padding = original * 2)
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 8, padding: all(24))
      Container(
        .id(card)
        .config(color: accent, cornerRadius: 12, padding: all(12))
        .obj(Text(.config(color: onAccent) .obj('The card')))
      )
      Text('now: $pad')
      Text('before any Inject: $original')
      Text(
        .config(color: muted)
        .obj(
          'rendered: ${Math.round(Reader.card.size?.w ?? 0)} × ${Math.round(Reader.card.size?.h ?? 0)}'
        )
      )
    ))
  )
)
```

> **Try it**
> - Change `original * 2` to `original * 3`: the card grows, "now" follows, "before any Inject" does not.
> - Delete the `Inject` line: both readouts show the declared `all(12)`.

Extracts are reactive: they update when the feature changes. Features are config keys (`padding`, `w`, `color`…), widget params, what the object shows (`obj`, [below](#objects-change-what-an-object-shows)), and the **rendered** features `size`, `pos` and `visible`, measured from layout and read-only. `.exeOrder(k)` reads the value **below** that point in the cascade: `.exeOrder(-1)` sees it before any Inject.

Inline references (`Source.card.size` in an expression) are Extracts too.

## Inject: change

An Inject changes a feature of another object, from anywhere. Here a widget, while it is shown, doubles a card's padding and recolours it:

```layr
Page(
  .name(Target)
  .route('/')
  var bool loud = false
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 12, padding: all(24))
      Container(
        .id(card)
        .config(color: accent, cornerRadius: 12, padding: all(10))
        .obj(Text(.config(color: onAccent) .obj('card')))
      )
      Button(
        .preset(default)
        .config(label: loud ? 'Remove Louder' : 'Show Louder')
        .fnc { loud = !loud }
      )
      If(.cnd(loud) .obj(Louder()))
    ))
  )
)

Widget(
  .name(Louder)
  Inject(.into(Target.card) .exeOrder(0) card.padding = card.padding * 2)
  Inject(.into(Target.card) .exeOrder(1) card.color = teal)
  .obj(Text(.config(color: muted) .obj('Louder is shown, so its two layers apply')))
)
```

> **Try it**
> - Press the button twice. When `Louder` goes away, its layers go with it and the card **reverts**: nothing had to undo them.
> - Give the second Inject `.exeOrder(0)` too: two layers on different features can share an order, so it still compiles. Now change it to `card.padding = all(4)` with `.exeOrder(0)`: two layers on the same feature at the same order is an error (L3102).

Each Inject is a **layer**: a change applied on top of the value below it. The rules:

- Layers apply in ascending `.exeOrder`. Two Injects on the same feature with the same order are an error (L3102). Injects without an order go after ordered ones, in file order, with a warning if two share a feature (L3103).
- Inside an Inject, the target's current value is the value from the layer below: `card.padding * 2` doubles whatever came before.
- A layer lives as long as its owner: a file-level Inject is permanent, a Page's while it is shown, a Widget's while that instance is shown. When the owner goes away, the layer goes and the value **reverts**.
- Writing a feature from a Function (`card.w = 360`) is the imperative form. It sets the base value; layers still apply above it.

## Objects: change what an object shows

What an object shows is a feature too: `.obj` names it. A Text's `obj` is its text, a Container's is its object, a Column's or Row's are its objects. Read it, write it and inject it like `padding`:

```layr
Page(
  .name(Order)
  .route('/')
  var bool shipped = false
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 12, padding: all(24))
      Container(
        .id(card)
        .config(
          .border(color: line, width: 1)
          color: panel
          cornerRadius: 12
          padding: all(16)
        )
        .obj(Column(
          .config(gap: 4)
          Text(
            .id(title)
            .config(size: 17, weight: semibold)
            .obj('Order 1042')
          )
          Text(.id(status) .config(color: muted) .obj('Packing'))
        ))
      )
      Button(
        .preset(default)
        .config(label: shipped ? 'Undo' : 'Ship it')
        .fnc { shipped = !shipped }
      )
      If(.cnd(shipped) .obj(Shipped()))
    ))
  )
)

Widget(
  .name(Shipped)
  Inject(.into(Order.status) status.obj = 'Shipped, arriving Tuesday')
  Inject(.into(Order.title) title.obj = title.obj + ' · paid')
  .obj(Text(.config(color: muted) .obj('Shipped is shown, so its layers apply')))
)
```

> **Try it**
> - Press **Ship it**, then **Undo**: the text changes and changes back, like any layer.
> - Replace the card's whole object: add `Inject(.into(Order.card) card.obj = Text(.config(color: accent) .obj('Delivered')))` inside `Shipped`.
> - Write `status.obj = Text('x')`: a Text shows text, so that is an error (L1007).

The same works for widgets and lists. A widget instance's params are features by name, and its `obj` is what the caller put in its `.obj`. A list's objects are replaced as a list:

```layr
Widget(
  .name(Tag)
  .param(txt label = 'New')
  .obj(Container(
    .config(color: accent, cornerRadius: 999, padding: sym(x: 10, y: 4))
    .obj(Text(.config(size: 13, color: onAccent, weight: medium) .obj(param.label)))
  ))
)

Page(
  .name(Menu)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(Column(
      .config(gap: 12, padding: all(24), xAlign: start)
      Tag(.id(tag))
      Column(.id(dishes) .config(gap: 4) Text('Soup'), Text('Bread'))
    ))
  )
)

Inject(.into(Menu.tag) tag.label = 'Today only')

Inject(
  .into(Menu.dishes)
  dishes.objs = [Text('Soup'), Text('Bread'), Text(.config(color: accent) .obj('Pie'))]
)
```

> **Try it**
> - Delete the first Inject: the Tag shows its default `New` again.
> - Change the list to `[Text('Closed today')]`: the Column shows one object.

The rules:

- A path that **ends** on a slot names the slot: `card.obj`, `list.objs` (`obj` and `objs` both name an object's default slot), `Menu.scaffold.bar`. A path that goes on descends into it: `card.obj.column.text(1)` is the second Text in the card.
- Objects written as values compile like the same objects in the layout: `card.obj = Text('Hi')`, `list.objs = [Text('a'), Text('b')]`. A Text's `obj` takes text.
- Inside an Inject, `title.obj` is the value below, so `title.obj + ' · paid'` extends the text. An Extract of a Text's `obj` reads its text.
- A Function writes it too: `status.obj = 'Shipped'`.

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
Container(.id(logo) .config(w: 40, !mut color: ink))
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
        .config(w: 120, h: 30, color: violet)
        .export(id: boxFeatures, size boxSize = container.size)
      )
      Text('doubled: $doubled')
    ))
  )
)
```

Export is optional: every feature is already reachable by id or path. Use it to name and document what other code should use.

## From React

React code joins the same cascade: `useExtract("Target::card", "padding")` reads a feature and `inject(address, key, order, fn)` adds a layer and returns a function that removes it. The key `"obj"` is what the object shows, so `inject("Order::status", "obj", 0, () => "Shipped")` changes a Text. See [React interop](/docs/react).
