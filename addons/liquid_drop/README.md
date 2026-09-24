# @dynshift/layr-liquid-drop

A living liquid drop: an organic shape that keeps breathing. It is a showpiece for what LAYR does on its own: `Animate` with a slow spring, and an action that writes a new shape to the drop every 1.4 seconds.

```layr
import { LiquidDrop } from '@dynshift/layr-liquid-drop'

LiquidDrop(.config(tint: #10b981, size: 120, label: 'LAYR'))
```

| Param | Type | Default |
|---|---|---|
| `tint` | color | `#2563eb` |
| `size` | len | `180` |
| `label` | txt | `''` |

The drop respects the reader's reduced-motion setting.
