# Widgets

Generated from the LAYR schema. Every key accepts the listed aliases; `layr format` rewrites them to the canonical name.

## Layout

### Container (aliases: Box)

A box: size, paint, border, corners, shadow and padding around one object.

```layr
Container(
  .config(
    w: 200
    h: 120
    color: #1c1917
    cornerRadius: 16
    objAlign: mid
  )
  .obj(Text(.config(color: white) .obj('Hello')))
)
```

Slots: `.obj` (one, default).

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `objAlign` | align | topLeft | alignment, contentAlign | Where the object's content sits inside it. |
| `overflow` | auto \| wrap \| stack \| scroll \| clip \| shrink \| warn \| error | auto |  | What happens when content does not fit. `auto` adapts deterministically (see Layout & Adaptation). |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Row

Lays objects out left to right. Adapts deterministically when space runs out.

```layr
Row(.config(gap: 8, yAlign: mid), Text('★'), Text('Starred'))
```

Slots: `.objs` (many, default).

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `xAlign` | axis | start | mainAxisAlignment | Horizontal distribution along the row. |
| `yAlign` | axis | start | crossAxisAlignment | Vertical alignment of children. |
| `gap` | len |  | spacing | Space between children. |
| `overflow` | auto \| wrap \| stack \| scroll \| clip \| shrink \| warn \| error | auto |  | What happens when content does not fit. `auto` adapts deterministically (see Layout & Adaptation). |
| `stackAt` | len |  |  | Row only: the width below which the row stacks into a column (computed automatically when omitted). |
| `reverse` | bool |  |  | Reverse the visual order. |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Column (aliases: Col)

Lays objects out top to bottom.

```layr
Column(.config(gap: 8), Text('Title'), Text('Body'))
```

Slots: `.objs` (many, default).

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `xAlign` | axis | start | crossAxisAlignment | Horizontal alignment of children. |
| `yAlign` | axis | start | mainAxisAlignment | Vertical distribution down the column. |
| `gap` | len |  | spacing | Space between children. |
| `overflow` | auto \| wrap \| stack \| scroll \| clip \| shrink \| warn \| error | auto |  | What happens when content does not fit. `auto` adapts deterministically (see Layout & Adaptation). |
| `stackAt` | len |  |  | Row only: the width below which the row stacks into a column (computed automatically when omitted). |
| `reverse` | bool |  |  | Reverse the visual order. |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Stack

Layers objects on top of each other; later objects paint above earlier ones (or use `Order`).

```layr
Stack(
  Container(.config(size: 200, cornerRadius: 16, color: #1c1917))
  Position(.config(x: 16, y: 16) .obj(Text(.config(color: white) .obj('Badge'))))
)
```

Slots: `.objs` (many, default).

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `objAlign` | align | topLeft | alignment, contentAlign | Where the object's content sits inside it. |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Position (aliases: Positioned)

Offsets an object inside a Stack by x/y, pins it to edges, or keeps it in view with `sticky: true`. Negative values are allowed.

```layr
Position(.config(bottom: -10, right: 0) .obj(Dot()))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `x` | len |  |  | Horizontal offset from where the object would sit. |
| `sticky` | bool |  |  | Stays in view while its scroll container scrolls, held at the given edges (top: 0 by default). |
| `y` | len |  |  | Vertical offset. |
| `top` | len |  |  | Distance from the Stack's top edge. |
| `right` | len |  |  | Distance from the right edge. |
| `bottom` | len |  |  | Distance from the bottom edge. |
| `left` | len |  |  | Distance from the left edge. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Order

Sets an object's layer in a Stack, Mask or Subtract. 0 is the base; negatives go below.

```layr
Order(.pos(1) .obj(Container(.config(size: 100, color: red))))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `pos` | int | 0 |  | Layer position. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Mid (aliases: Center, Centre, Cen)

Fills its parent and centres its object.

```layr
Mid(Text('Centred'))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Align

Fills its parent and places its object at an alignment.

```layr
Align(.config(to: bottomRight) .obj(Button(.config(label: 'Next'))))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `to` | align | mid | align, alignment | Where to place the object. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Expand (aliases: Expanded, Flexible)

Makes its object fill the remaining space along the parent's direction.

```layr
Row(Text('Name'), Expand(Input(.config(label: 'Name'))))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `flex` | num | 1 |  | Share of the remaining space. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Gap (aliases: Space, SizedBox, Spacer)

Fixed empty space along the parent's direction: `Gap(20)`.

```layr
Column(Text('A'), Gap(24), Text('B'))
```

Slots: `.size` (text, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `size` | len | 0 |  | The space. |

### Wrap

Lays objects out in rows that wrap onto new lines.

```layr
Wrap(.config(gap: 8), Chip('a'), Chip('b'), Chip('c'))
```

Slots: `.objs` (many, default).

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `gap` | len |  |  | Space between objects on a line. |
| `runGap` | len |  |  | Space between lines. |
| `xAlign` | axis | start | mainAxisAlignment | Horizontal distribution along the row. |
| `yAlign` | axis | start | crossAxisAlignment | Vertical alignment of children. |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Grid

A grid with a fixed column count or columns that fit a minimum item width.

```layr
Grid(.config(minItemW: 240, gap: 16), Card(), Card(), Card())
```

Slots: `.objs` (many, default).

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `cols` | int |  |  | Number of columns. |
| `minItemW` | len |  |  | Minimum item width; columns fit automatically (ignored when `cols` is set). |
| `gap` | len |  |  | Space between items. |
| `rowGap` | len |  |  | Space between rows (defaults to `gap`). |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Scroll (aliases: ScrollView, SingleChildScrollView)

Scrolls its object along an axis.

```layr
Scroll(.config(axis: x), Row(Card(), Card(), Card()))
```

Slots: `.obj` (one, default).

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `axis` | y \| x \| both | y |  | Scroll direction. |
| `bar` | auto \| show \| hide | auto |  | Scrollbar visibility. |
| `snap` | none \| start \| mid \| end | none |  | Scroll snapping. |
| `fade` | len |  |  | Fades content out over this distance at the edges that can still scroll, so nothing ends in a hard cut. |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Aspect (aliases: AspectRatio)

Keeps its object at an aspect ratio.

```layr
Aspect(.config(ratio: 16/9) .obj(Image(.config(src: 'hero.jpg', alt: 'Hero'))))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `ratio` | num | 1 |  | Width / height. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### SafeArea

Pads its object away from device notches and system bars.

```layr
SafeArea(Column(...))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `edges` | all \| top \| bottom \| x \| y | all |  | Which edges to protect. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Adapt (aliases: ViewThatFits)

Shows the first candidate layout that fits the available space.

```layr
Adapt(Row(Logo(), Nav()), Column(Logo(), Nav()))
```

Slots: `.objs` (many, default, required).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Scaffold (aliases: Frame)

The page's viewport box: full height, safe areas, scroll policy and the overflow boundary.

```layr
Scaffold(
  .config(color: white.shade(1))
  .body(Mid(Text('Hello')))
)
```

Slots: `.bar` (one), `.body` (one, default), `.footer` (one).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `color` | paint |  | colorBG, bg, background | Page background. |
| `textColor` | color |  | fg, foreground | The page's text colour: every Text without its own `color` uses it. Without it, text follows the colour scheme (dark text on light, light on dark). |
| `scroll` | y \| none | y |  | `y` scrolls the page (default); `none` makes a fixed, app-like screen. |
| `fit` | width \| contain \| cover \| canvas |  |  | Design Scale fit: `width` (default for scrolling), `contain` (default for fixed screens), `cover` or `canvas`. |
| `padding` | insets |  |  | Space inside the page. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

## Content

### Text (aliases: Txt)

Text. `type` gives it meaning (h1–h6, p, label, code) for accessibility and SEO.

```layr
Text(.config(type: h1, size: 48, weight: bold) 'Hello')
```

Slots: `.obj` (text, default, required).

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `size` | len |  | fontSize | Font size in design px. |
| `font` | txt |  | fontFamily | Font family, e.g. `'Geist'`. |
| `weight` | thin \| light \| regular \| medium \| semibold \| bold \| black |  | fontWeight, wight | Font weight: `thin`…`black` or 100–900. |
| `italic` | bool |  | italics | Italic style. |
| `color` | paint |  |  | Text colour (a gradient paints the glyphs). |
| `align` | left \| mid \| right \| start \| end \| justify |  | textAlign, textAlight | Text alignment. |
| `lineHeight` | num |  |  | Line height as a multiple of the font size. |
| `letterSpacing` | len |  |  | Space between letters. |
| `type` | h1 \| h2 \| h3 \| h4 \| h5 \| h6 \| p \| label \| code \| span \| strong \| em | p |  | Semantic type (sets the element and default style): h1–h6, p, label, code, span. |
| `underline` | bool |  |  | Underline. |
| `underlinePos` | auto \| under \| baseline |  |  | Underline position. |
| `underlineSkipInk` | bool | true |  | Skip descenders when underlining. |
| `strike` | bool |  |  | Strike-through. |
| `transform` | none \| upper \| lower \| capitalize |  |  | Case transform. |
| `overflow` | wrap \| ellipsis \| fade \| scale \| clip | wrap |  | Long text: wrap (default), ellipsis, fade, scale or clip. |
| `maxLines` | int |  |  | Maximum lines before `overflow` applies. |
| `selectable` | bool | true |  | Allow selection. |
| `baseline` | top \| mid \| bottom \| baseline |  | textBaseline | Vertical alignment inside a line. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Span (aliases: RichText)

Inline text runs inside Text: `Text(Span(.config(weight: bold) 'Bold'), ' and plain')`.

```layr
Text('Read the ', Span(.config(underline: true) 'docs'))
```

Slots: `.objs` (many, default).

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `size` | len |  | fontSize | Font size in design px. |
| `font` | txt |  | fontFamily | Font family, e.g. `'Geist'`. |
| `weight` | thin \| light \| regular \| medium \| semibold \| bold \| black |  | fontWeight, wight | Font weight: `thin`…`black` or 100–900. |
| `italic` | bool |  | italics | Italic style. |
| `color` | paint |  |  | Text colour (a gradient paints the glyphs). |
| `align` | left \| mid \| right \| start \| end \| justify |  | textAlign, textAlight | Text alignment. |
| `lineHeight` | num |  |  | Line height as a multiple of the font size. |
| `letterSpacing` | len |  |  | Space between letters. |
| `underline` | bool |  |  | Underline. |
| `underlinePos` | auto \| under \| baseline |  |  | Underline position. |
| `underlineSkipInk` | bool | true |  | Skip descenders when underlining. |
| `strike` | bool |  |  | Strike-through. |
| `transform` | none \| upper \| lower \| capitalize |  |  | Case transform. |
| `overflow` | wrap \| ellipsis \| fade \| scale \| clip | wrap |  | Long text: wrap (default), ellipsis, fade, scale or clip. |
| `selectable` | bool | true |  | Allow selection. |
| `baseline` | top \| mid \| bottom \| baseline |  | textBaseline | Vertical alignment inside a line. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Image (aliases: Img)

An image. Give `alt` (or `decorative: true`). Per-frame sources: `src: (m: 'a.jpg', w: 'a@2x.jpg')`.

```layr
Image(.config(src: 'hero.jpg', alt: 'A mountain lake', w: fill, aspect: 16/9))
```

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `src` | src |  |  | Image URL, or one per frame. |
| `alt` | txt |  |  | Text alternative for screen readers. |
| `decorative` | bool |  |  | Purely decorative: hidden from assistive technology. |
| `fit` | cover \| contain \| fill \| none \| scaleDown | cover |  | How the image fills its box. |
| `position` | align | mid |  | Focal point when cropped. |
| `lazy` | bool | true |  | Load when near the viewport. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `cornerRadius` | radius |  | radius | Corner radius. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Svg

An SVG from a URL; `color` sets currentColor.

```layr
Svg(.config(src: 'logo.svg', alt: 'LAYR', h: 24))
```

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `src` | src |  |  | SVG URL. |
| `alt` | txt |  |  | Text alternative. |
| `color` | color |  |  | currentColor. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Icon

An icon by name from the registered icon set (e.g. the `icons` addon).

```layr
Icon('arrow-right')
```

Slots: `.name` (text, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `name` | txt |  |  | Icon name. |
| `size` | len | 24 |  | Icon size. |
| `color` | color |  |  | Icon colour. |
| `label` | txt |  |  | Accessible label; omit for decorative icons. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Video

A video with native controls and captions.

```layr
Video(.config(src: 'intro.mp4', captions: 'intro.vtt', w: fill, aspect: 16/9))
```

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `src` | src |  |  | Video URL. |
| `poster` | src |  |  | Poster image. |
| `captions` | src |  |  | WebVTT captions URL. |
| `autoplay` | bool |  |  | Autoplay (implies muted). |
| `loop` | bool |  |  | Loop. |
| `muted` | bool |  |  | Muted. |
| `controls` | bool | true |  | Show controls. |
| `fit` | cover \| contain \| fill | contain |  | How the video fills its box. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `cornerRadius` | radius |  |  | Corner radius. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

## Effects

### Blur

Blurs what is behind the object (`blurOn: background`, frosted glass) or the object's own content (`blurOn: object`), uniformly or progressively: a progressive blur rises smoothly toward one `edge`, the way content dissolves under a header or at the end of a list.

```layr
Stack(.config(w: fill, h: 220, cornerRadius: 16, clip: true), Container(.config(w: fill, h: fill, color: LinearGradient(.colors(#ff6a3d, #9b8cff, #2ed3c4)))), Row(.config(w: fill, h: fill, gap: 16, padding: all(24), yAlign: mid), Container(.config(size: 64, cornerRadius: 32, color: #ffc46b)), Container(.config(size: 96, cornerRadius: 20, color: #1c1917))), Position(.config(left: 40, right: 40, top: 50, bottom: 50) .obj(Blur(.config(w: fill, h: fill, value: 18, cornerRadius: 14, color: #fffcf7.alpha(35%)) .obj(Mid(Text(.config(size: 18, weight: semibold, color: #1c1917) .obj('Frosted glass'))))))))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `blurOn` | background \| object | background |  | What to blur: what shows through from behind (`background`), or the content inside (`object`). |
| `type` | uniform \| progressive | uniform |  | Uniform, or progressive (clear at one side, strongest at `edge`). |
| `value` | len | 12 |  | Blur radius; for a progressive blur, the radius at `edge`. |
| `edge` | bottom \| top \| left \| right | bottom |  | Progressive: the side where the blur is strongest. |
| `extent` | any | 100% |  | Progressive: how far from `edge` the blur reaches, as a length or a percentage of the object. |
| `layers` | num | 8 |  | Progressive: blur layers. More is smoother and costs more to paint. |
| `curve` | linear \| ease \| exponential | exponential |  | Progressive: how the blur grows toward `edge`. `exponential` stays clear longest and feels most natural. |
| `fade` | color |  |  | Progressive: a colour the blurred edge fades into, e.g. the page background, so text over it stays readable. |
| `values` | any |  |  | Progressive: blur radii at the clear side and at `edge`, e.g. `(0, 25)` (instead of `value`). |
| `direction` | any |  |  | Progressive: from/to alignment, e.g. `(t, b)` (the older form of `edge`). |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Mask

Masks layers with the lowest `Order` layer (a paint: colour, gradient or image).

```layr
Mask(
  Order(.pos(0) .obj(Container(.config(size: 200, color: LinearGradient(.colors(black.alpha(0), black))))))
  Order(.pos(1) .obj(Container(.config(size: 200, color: red))))
)
```

Slots: `.objs` (many, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `mode` | alpha \| luminance | alpha |  | Mask by alpha or luminance. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Subtract

Cuts the upper layer's shape out of the base layer.

```layr
Subtract(
  Order(.pos(0) .obj(Container(.config(size: 200, color: black))))
  Order(.pos(1) .obj(Position(.config(bottom: -10) .obj(Container(.config(size: 100, cornerRadius: 50))))))
)
```

Slots: `.objs` (many, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `align` | align | mid |  | Where the cut sits by default. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Clip

Clips its object to a shape.

```layr
Clip(.config(shape: circle) .obj(Image(.config(src: 'me.jpg', alt: 'Portrait', size: 64))))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `shape` | rect \| circle \| ellipse | rect |  | Clip shape. |
| `cornerRadius` | radius |  |  | Corner radius for `rect`. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Filter

Colour filters and blend modes for its object.

```layr
Filter(.config(grayscale: 1) .obj(Image(.config(src: 'a.jpg', alt: 'A'))))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `grayscale` | num |  |  | 0–1. |
| `blur` | len |  |  | Blur radius. |
| `brightness` | num |  |  | 1 is unchanged. |
| `contrast` | num |  |  | 1 is unchanged. |
| `saturate` | num |  |  | 1 is unchanged. |
| `hueRotate` | angle |  |  | Hue rotation. |
| `invert` | num |  |  | 0–1. |
| `sepia` | num |  |  | 0–1. |
| `blend` | normal \| multiply \| screen \| overlay \| darken \| lighten \| difference \| exclusion \| color \| luminosity |  |  | Blend mode with what is behind. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

## Interact

### Button

An accessible button. `.fnc(...)` runs on activation (click, Enter, Space). Unstyled except `.preset(default)`.

```layr
Button(.preset(default) .config(label: 'Save') .fnc(save()))
```

Slots: `.obj` (one, default).

`.fnc` runs on `press`.

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `label` | txt |  |  | Button text (and accessible name). |
| `disabled` | bool |  |  | Disabled. |
| `submit` | bool |  |  | Submits its Form. |
| `objAlign` | align | topLeft | alignment, contentAlign | Where the object's content sits inside it. |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Link

Navigates to a page or URL.

```layr
Link(.config(to: DocsPage) .obj(Text('Docs')))
```

Slots: `.obj` (one, default).

`.fnc` runs on `press`.

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `to` | page |  |  | Page to open, e.g. `DemoPage`. |
| `href` | txt |  |  | External URL. |
| `label` | txt |  |  | Link text (when there is no object). |
| `external` | bool |  |  | Open in a new tab. |
| `underline` | bool |  |  | Underline the link (browsers underline links by default). |
| `objAlign` | align | topLeft | alignment, contentAlign | Where the object's content sits inside it. |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Input (aliases: TextField)

A labelled text input. `.fnc` runs on change with the new value.

```layr
Input(.config(label: 'Email', kind: email, value: email) .fnc { email = value })
```

`.fnc` runs on `change`.

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`, `submit`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `value` | txt |  |  | Current value (bind a var to make it two-way). |
| `label` | txt |  |  | Label (required for accessibility). |
| `placeholder` | txt |  |  | Placeholder. |
| `kind` | text \| email \| password \| number \| search \| tel \| url | text |  | Input kind. |
| `multiline` | bool |  |  | A multi-line text area. |
| `rows` | int |  |  | Visible rows for multiline. |
| `disabled` | bool |  |  | Disabled. |
| `required` | bool |  |  | Required. |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Toggle (aliases: Checkbox, Switch)

A checkbox or switch.

```layr
Toggle(.config(label: 'Dark mode', kind: switch, value: dark) .fnc { dark = value })
```

`.fnc` runs on `change`.

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `value` | bool |  |  | On or off. |
| `label` | txt |  |  | Label. |
| `kind` | checkbox \| switch | checkbox |  | Presentation. |
| `disabled` | bool |  |  | Disabled. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Select

A labelled choice from options.

```layr
Select(.config(label: 'Size', options: ['S', 'M', 'L'], value: size) .fnc { size = value })
```

`.fnc` runs on `change`.

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `value` | txt |  |  | Selected value. |
| `options` | any |  |  | List of options or `(value, label)` tuples. |
| `label` | txt |  |  | Label. |
| `disabled` | bool |  |  | Disabled. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Slider

A labelled range slider.

```layr
Slider(.config(label: 'Volume', value: vol) .fnc { vol = value })
```

`.fnc` runs on `change`.

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `value` | num |  |  | Current value. |
| `min` | num | 0 |  | Minimum. |
| `max` | num | 100 |  | Maximum. |
| `step` | num | 1 |  | Step. |
| `label` | txt |  |  | Label. |
| `disabled` | bool |  |  | Disabled. |
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

### Form

Groups inputs; `.fnc` runs on submit.

```layr
Form(.fnc(send()), Input(.config(label: 'Name')), Button(.config(label: 'Send', submit: true)))
```

Slots: `.objs` (many, default).

`.fnc` runs on `submit`.

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `gap` | len |  |  | Space between fields. |

### Overlay (aliases: Dialog, Popover, Modal)

Content above the page (dialogs, popovers, sheets) with focus management. Unstyled.

```layr
Overlay(.config(open: showHelp, label: 'Help') .on(close: { showHelp = false }) .obj(HelpCard()))
```

Slots: `.obj` (one, default).

Events: `tap`, `press`, `hover`, `hoverEnd`, `focus`, `blur`, `key`, `drag`, `swipe`, `mount`, `unmount`, `visible`, `close`.

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `w` | len \| fill \| hug |  | width | Width: a length, `fill` (share the remaining space) or `hug` (fit content, default). |
| `h` | len \| fill \| hug |  | height | Height: a length, `fill` or `hug` (default). |
| `size` | size |  | s | Width and height together: `size: 200` or `size: (200, 120)`. |
| `minW` | len |  | minWidth | Minimum width. |
| `maxW` | len |  | maxWidth | Maximum width. |
| `minH` | len |  | minHeight | Minimum height. |
| `maxH` | len |  | maxHeight | Maximum height. |
| `aspect` | num |  | aspectRatio | Aspect ratio (width / height), e.g. `16/9`. |
| `color` | paint |  | bg, background, colorBG | Background paint: a colour or gradient. |
| `padding` | insets |  | pad | Space inside the object. |
| `cornerRadius` | radius |  | radius, borderRadius, corner | Corner radius: one length or `only(topLeft: 8, …)`. |
| `borderWidth` | len |  |  | Border width. |
| `borderColor` | color |  |  | Border colour. |
| `borderAlign` | in \| mid \| out | in |  | Where the border sits relative to the edge: `in`, `mid` or `out`. |
| `borderStyle` | solid \| dashed \| dotted | solid |  | Border line style. |
| `borderSides` | all \| top \| bottom \| left \| right \| x \| y | all |  | Which sides draw the border (inside the box). |
| `shadow` | shadow |  |  | Drop shadow(s): `shadow(y: 4, blur: 12, color: black.alpha(20%))`. |
| `clip` | bool |  |  | Clip children to the object's bounds (and corner radius). |
| `z` | int |  |  | Stacking order among siblings. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |
| `open` | bool |  |  | Whether it is shown. |
| `modal` | bool | true |  | Blocks the page and traps focus. |
| `dismissible` | bool | true |  | Escape and backdrop click close it. |
| `label` | txt |  |  | Accessible name. |
| `placement` | align | mid |  | Where it appears. |
| `backdrop` | paint |  |  | Backdrop paint for modal overlays. |

Group `.border(align, color, width, style, sides)`: Border settings grouped: `.border(align: in, color: #0d0d0d, width: 2)`.

### Focus

Focus behaviour for its object: autofocus, focus ring, trap.

```layr
Focus(.config(auto: true) .obj(Input(.config(label: 'Search'))))
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `auto` | bool |  |  | Focus on mount. |
| `ring` | bool | true |  | Show the focus ring. |
| `trap` | bool |  |  | Keep focus inside. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

## Motion

### Animate (aliases: Anim)

Interpolates every change to its object. `.eases(w: spring.gentle)` per property; `.enter(...)`/`.exit(...)` for mount and unmount.

```layr
Animate(
  .eases(w: spring.gentle, h: spring.bounce)
  .obj(Container(.id(box) .config(w: boxW, h: 100, color: red)))
)
```

Slots: `.obj` (one, default).

| Key | Type | Default | Aliases | Meaning |
|---|---|---|---|---|
| `duration` | time | 300ms |  | Duration for eased (non-spring) transitions. |
| `ease` | motion | spring.gentle |  | Default motion for all properties: an ease or a spring. |
| `delay` | time |  |  | Delay before transitions start. |
| `motion` | respect \| always | respect |  | Respect reduced-motion preferences (default) or always animate. |
| `resize` | follow \| animate | follow |  | Continuous window resizes follow instantly (default) or animate. |
| `margin` | insets |  |  | Space outside the object: `all(8)`, `sym(x: 8, y: 4)`, `only(top: 8)`. |
| `opacity` | num |  |  | Opacity from 0 to 1. |
| `hide` | bool |  | hidden | Removes the object from layout and the accessibility tree. |
| `shrink` | num | 1 |  | Shrink priority when space runs out. Lower shrinks first; 0 never shrinks. |
| `flex` | num | 1 |  | Share of remaining space for `fill` sizes. |
| `cursor` | auto \| pointer \| text \| grab \| grabbing \| move \| notAllowed \| crosshair \| none |  |  | Pointer cursor. |
| `className` | txt |  | class | Extra CSS class names: styling hooks for your own stylesheet (hover rules, third-party CSS). |

## Constructs

### App

The application root: Design Scale, theme, providers and global state.

Modifiers: `.scale`, `.theme`, `.providers`, `.meta`, `.react`.

```layr
App(.scale(DesignScale(.m(w: 390, h: 844) .w(w: 1440, h: 900))))
```

### Page

A routable page: route, metadata, data loading, state and one Scaffold.

Modifiers: `.name`, `.route`, `.meta`, `.load`, `.paths`, `.state`, `.scale`, `.react`, `.on`.

```layr
Page(.name(Home) .route('/') Scaffold(.body(Mid(Text('Hello')))))
```

### Widget

A reusable widget. Params become config keys; `.obj(.obj)` forwards the caller's object.

Modifiers: `.name`, `.param`, `.react`, `.obj`.

```layr
Widget(.name(Card) .param(req txt title) .obj(Container(.config(padding: all(16)) .obj(Text(param.title)))))
```

### Function

A named, typed action. Body as SAPI steps `.def(...)` or TypeScript `.def { }`.

Modifiers: `.name`, `.param`, `.def`.

```layr
Function(.name(inc) .param(ref int n) .def { n++ })
```

### Preset

A named config bundle for a widget type.

Modifiers: `.name`, `.for`, `.config`.

```layr
Preset(.name(primary) .for(Button) .config(color: blue, padding: sym(x: 16, y: 10)))
```

### DesignScale

Design frames and scale limits for the app, a page or a subtree.

Modifiers: `.m`, `.t`, `.w`, `.uw`, `.frame`, `.config`, `.obj`.

```layr
DesignScale(.m(w: 390, h: 844) .w(w: 1440, h: 900))
```

### Theme

Named colours and fonts exposed as tokens (CSS variables `--layr-color-<name>`, `--layr-font-<name>`). `.dark(...)` overrides colours when the system is in dark mode; `font: <name>` on Text uses a theme font.

Modifiers: `.colors`, `.dark`, `.font`.

```layr
Theme(.colors(ink: #0d0d0d, paper: #fdfdfd) .dark(ink: #fdfdfd, paper: #0d0d0d) .font(body: 'Geist'))
```

### Extract

Reads features of any object, optionally at a point in its injection cascade.

Modifiers: `.from`, `.lookUp`, `.exeOrder`.

```layr
Extract(.from(SomePage.card) insets pad = card.padding)
```

### Inject

Changes a feature of any object from anywhere as a reversible layer ordered by `.exeOrder`.

Modifiers: `.into`, `.lookUp`, `.exeOrder`, `.force`.

```layr
Inject(.into(SomePage.card) .exeOrder(0) card.padding = pad * 2)
```

### Export

Names and groups features of an object under an export id (optional; everything is reachable by path or id).

Modifiers: `.from`, `.lookUp`.

```layr
Export(.from(SomePage.card) size cardSize = card.size)
```

### If

Shows `.obj(...)` when `.cnd(test)` is true, otherwise `.fb(...)`.

### Each

Repeats `.obj(...)` for every item of `.of(list)`; `.as(item, index)` names them; `.key(expr)` sets a stable key.
