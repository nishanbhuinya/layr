---
title: Export, Inject, Extract, Duplicate
nav: EIED
description: "EIED: name, change, read and copy any object's features from anywhere, as reversible, ordered layers the compiler checks."
order: 34
---

# Export, Inject, Extract, Duplicate

Any part of a LAYR app can name what an object shares (**Export**), **change** it (**Inject**), **read** it (**Extract**) and **copy** it (**Duplicate**), for any object in any page or widget. Together they are **EIED**. Changes are layers: ordered, reversible, and known to the compiler, in one chain per object.

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
  Extract(
    .from(Reader.card)
    insets pad = card.padding
  )
  Extract(
    .from(Reader.card)
    .exeOrder(-1)
    insets original = card.padding
  )
  Inject(
    .into(Reader.card)
    .exeOrder(0)
    card.padding = original * 2
  )
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(
          gap: 8
          padding: all(24)
        )
        Container(
          .id(card)
          .config(
            color: accent
            cornerRadius: 12
            padding: all(12)
          )
          .obj(
            Text(
              .config(color: onAccent)
              .obj('The card')
            )
          )
        )
        Text('now: $pad')
        Text('before any Inject: $original')
        Text(
          .config(color: muted)
          .obj(
            'rendered: ${Math.round(Reader.card.size?.w ?? 0)} × ${Math.round(Reader.card.size?.h ?? 0)}'
          )
        )
      )
    )
  )
)
```

> **Try it**
> - Change `original * 2` to `original * 3`: the card grows, "now" follows, "before any Inject" does not.
> - Delete the `Inject` line: both readouts show the declared `all(12)`.

Extracts are reactive: they update when the feature changes. Features are config keys (`padding`, `w`, `color`…), widget params, what the object shows (`obj`, [below](#objects-change-what-an-object-shows)), and the **rendered** features `size`, `pos` and `visible`, measured from layout. You cannot change a measurement: `pos` and `visible` are read-only, and writing `size` changes the object's own `size` key instead (a Text's font size, a box's size), while reading it still gives what was measured. `.exeOrder(k)` reads the value **below** that point in the cascade: every Inject with a lower order, none at `k` or above. Here `.exeOrder(-1)` reads the card before the Inject at `0`.

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
    .body(
      Column(
        .config(
          gap: 12
          padding: all(24)
        )
        Container(
          .id(card)
          .config(
            color: accent
            cornerRadius: 12
            padding: all(10)
          )
          .obj(
            Text(
              .config(color: onAccent)
              .obj('card')
            )
          )
        )
        Button(
          .preset(default)
          .config(label: loud ? 'Remove Louder' : 'Show Louder')
          .fnc { loud = !loud }
        )
        If(
          .cnd(loud)
          .obj(Louder())
        )
      )
    )
  )
)

Widget(
  .name(Louder)
  Inject(
    .into(Target.card)
    .exeOrder(0)
    card.padding = card.padding * 2
  )
  Inject(
    .into(Target.card)
    .exeOrder(1)
    card.color = teal
  )
  .wgt(
    Text(
      .config(color: muted)
      .obj('Louder is shown, so its two layers apply')
    )
  )
)
```

> **Try it**
> - Press the button twice. When `Louder` goes away, its layers go with it and the card **reverts**: nothing had to undo them.
> - Give the second Inject `.exeOrder(0)` too. The result reports L3102: both operations on `card` sit at order 0, so nothing says which comes first, even though they change different features. The message names the next free order.

Each Inject is a **layer**: a change applied on top of the value below it. The rules:

- Layers apply in ascending `.exeOrder`, like `z-index`: any integer works, negative and large ones included. `-9999` runs under everything and `9999` over everything; the highest order has the last word.
- **On one object, every operation takes its own order.** Two Exports, Extracts, Injects or Duplicates on the same object cannot share a number, whatever features they touch (L3102, with the nearest free order as the fix). Operations on *different* objects may share numbers: the numbers are one timeline for the whole project, and `-5` means the same moment everywhere. One Inject can change several features of its object at its one order.
- Injects without an order go after the ordered ones, in file order. Two of them changing the same feature are an error (L3103); give one an order.
- `.exeOrder` has short forms for fast typing: `.exeOrd`, `.eOrd` and `.eO`. `layr format` writes them as `.exeOrder`.
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
    .body(
      Column(
        .config(
          gap: 12
          padding: all(24)
        )
        Container(
          .id(card)
          .config(
            color: panel
            cornerRadius: 12
            padding: all(16)
            .border(
              color: line
              width: 1
            )
          )
          .obj(
            Column(
              .config(gap: 4)
              Text(
                .id(title)
                .config(
                  size: 17
                  weight: semibold
                )
                .obj('Order 1042')
              )
              Text(
                .id(status)
                .config(color: muted)
                .obj('Packing')
              )
            )
          )
        )
        Button(
          .preset(default)
          .config(label: shipped ? 'Undo' : 'Ship it')
          .fnc { shipped = !shipped }
        )
        If(
          .cnd(shipped)
          .obj(Shipped())
        )
      )
    )
  )
)

Widget(
  .name(Shipped)
  Inject(
    .into(Order.status)
    status.obj = 'Shipped, arriving Tuesday'
  )
  Inject(
    .into(Order.title)
    title.obj = title.obj + ' · paid'
  )
  .wgt(
    Text(
      .config(color: muted)
      .obj('Shipped is shown, so its layers apply')
    )
  )
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
  .wgt(
    Container(
      .config(
        color: accent
        cornerRadius: 999
        padding: sym(x: 10, y: 4)
      )
      .obj(
        Text(
          .config(
            size: 13
            color: onAccent
            weight: medium
          )
          .obj(param.label)
        )
      )
    )
  )
)

Page(
  .name(Menu)
  .route('/')
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(
          gap: 12
          padding: all(24)
          xAlign: start
        )
        Tag(.id(tag))
        Column(
          .id(dishes)
          .config(gap: 4)
          Text('Soup')
          Text('Bread')
        )
      )
    )
  )
)

Inject(
  .into(Menu.tag)
  tag.label = 'Today only'
)

Inject(
  .into(Menu.dishes)
  dishes.objs = [Text('Soup'), Text('Bread'), Text(
    .config(color: accent)
    .obj('Pie')
  )]
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

## Duplicate: a copy at a point in the chain

`Duplicate` shows a copy of another object of the same Page or Widget, in its own place. The copy follows its original: the same config, the same writes, and every Inject **below** the Duplicate's `.exeOrder`. Its own `.config` sets the copy, and dotted keys reach inside it.

```layr
Page(
  .name(Plans)
  .route('/')
  var bool annual = false
  Inject(
    .into(Plans.plan)
    .exeOrder(-1)
    plan.padding = all(20)
  )
  Inject(
    .into(Plans.plan)
    .exeOrder(5)
    plan.color = accent
  )
  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(
          gap: 12
          padding: all(24)
        )
        Container(
          .id(plan)
          .config(
            color: panel
            cornerRadius: 12
          )
          .on(tap: annual = !annual)
          Text(annual ? 'Pro · yearly' : 'Pro · monthly')
        )
        Duplicate(
          .id(draft)
          .from(plan)
          .exeOrder(+1)
          .config(
            cornerRadius: 0
            plan.text.weight: bold
          )
        )
      )
    )
  )
)
```

The first card has both layers: padding at `-1`, the accent at `5`. The copy at `+1` has the padding but not the accent, square corners and bold text from its own config. Tapping the original changes the text of both, because the copy follows its state.

> **Try it**
> - Remove `.exeOrder(+1)` from the Duplicate: without an order it copies the final value, accent included.
> - Change it to `.exeOrder(5)`: the Inject at `5` already has that place in `plan`'s chain, so it is an error (L3102).

- The copy is part of the page's tree. With `.id(draft)` it is a target like any object (`Inject(.into(Plans.draft) …)`), and its insides are reached by path (`Plans.draft.text`).
- `.tar(...)` is accepted for `.from(...)`. A Duplicate cannot sit inside the object it copies (L3305).

## The chain of an object

Every object with operations on it has one chain, from the most negative order to the most positive. `layr chain` starts from the objects: what changes each one and what reads it.

```text
$ layr chain
LAYR chain  3 object(s) that operations change or read

  Plans.draft          changed by 1   orders +1
  Plans.draft.text(0)  changed by 1   orders +1
  Plans.plan           changed by 2 · read by 1   orders -1 +1 +5
```

The two Injects change `plan`, and the Duplicate reads it. The Duplicate's config changes its copy, `draft`, and the Text inside the copy.

Name one to see its chain in order, with each value and where it is written:

```text
$ layr chain plan
Plans.plan  declared config, then each operation by exeOrder

     -1  Inject    plan.padding = all(20)  src/pages/index.layr:8:5
     +1  Duplicate copied as draft  src/pages/index.layr:32:9  reads what is below +1
     +5  Inject    plan.color = accent  src/pages/index.layr:13:5
```

Two operations at one order on the object are marked with ✗ in this list, next to the L3102 error.

`layr chain --all` lists every operation in the project by order, and `--json` gives any of these to tools.

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
Container(
  .id(logo)
  .config(
    w: 40
    !mut color: ink
  )
)
```

Any Extract/Inject change to a `!mut` feature is an error (L3101); at runtime it is ignored with a warning. For system code that must override it, `Inject(.force ...)` is allowed only in files listed under `access.force` in `layr.yaml`, and the analyzer lists every forced injection.

## Export: name what you share

`.export(...)` gives features names under an export id, like a small public interface for an object:

```layr
Page(
  .name(Shared)
  bind size doubled = boxFeatures.boxSize * 2
  Scaffold(
    .body(
      Column(
        Container(
          .config(
            w: 120
            h: 30
            color: violet
          )
          .export(
            id: boxFeatures
            size boxSize = container.size
          )
        )
        Text('doubled: $doubled')
      )
    )
  )
)
```

Export is optional: every feature is already reachable by id or path. Use it to name and document what other code should use.

## From React

React code joins the same cascade: `useExtract("Target::card", "padding")` reads a feature and `inject(address, key, order, fn)` adds a layer and returns a function that removes it. The key `"obj"` is what the object shows, so `inject("Order::status", "obj", 0, () => "Shipped")` changes a Text. See [React interop](/docs/react).
