## A number of times

`Repeat` shows its object `.times(n)` times, as siblings in whatever holds it: a Row lays the repeats side by side, a Column stacks them, a Wrap wraps them.

```layr
Row(
  .config(gap: 8)
  Repeat(
    .times(5)
    Container(
      .config(
        size: 28
        color: accent
        cornerRadius: 14
      )
    )
  )
)
```

> **Try it**
> - Change `.times(5)` to `.times(12)` and put the Repeat in a `Wrap` instead of a `Row`: the dots wrap onto the next line.

## Which repeat this is

Inside a Repeat, `rep.index` counts from 0, `rep.count` is the number of repeats, and `rep.first` and `rep.last` are true at the ends. `.as(i)` gives the index a shorter name.

```layr
Column(
  .config(gap: 6)
  Repeat(
    .times(4)
    .as(i)
    Container(
      .config(
        w: 120 + i * 40
        color: rep.last ? accent : panel
        cornerRadius: 6
        padding: sym(x: 10, y: 4)
      )
      Text('Bar ${i + 1} of ${rep.count}')
    )
  )
)
```

> **Try it**
> - Change `rep.last` to `rep.first`: the first bar takes the accent colour.
> - Change `120 + i * 40` to `260 - i * 40`: the bars shrink instead of grow.

## Between repeats, and a count from state

`.sep(...)` goes between two repeats, never before the first or after the last. The count can be state, so the list follows it.

```layr
Page(
  .name(Steps)
  .route('/')
  var int steps = 3

  Scaffold(
    .config(color: canvas)
    .body(
      Column(
        .config(
          gap: 16
          padding: all(24)
        )
        Row(
          .config(
            gap: 6
            yAlign: mid
          )
          Repeat(
            .times(steps)
            .as(i)
            .sep(
              Text(
                .config(color: faint)
                .obj('→')
              )
            )
            Container(
              .config(
                color: rep.last ? accent : panel
                cornerRadius: 8
                padding: sym(x: 12, y: 6)
              )
              Text('Step ${i + 1}')
            )
          )
        )
        Button(
          .preset(default)
          .config(label: 'Add a step')
          .fnc { steps = steps < 6 ? steps + 1 : 1 }
        )
      )
    )
  )
)
```

> **Try it**
> - Press **Add a step**: a step and its arrow appear, and the accent moves to the new last step.
> - Change the separator's `'→'` to `'·'`.

To show one object per item of a list, use [`Each`](/api/each); to show an object only while a condition holds, [`If`](/api/if). `.repOrder` is accepted for `.times`, and `layr format` writes `.times`.
