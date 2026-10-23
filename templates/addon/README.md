# {{name}}

A [LAYR](https://layr.dynshift.com) addon.

```sh
layr add {{id}}
```

```layr
import {{Name}} from 'layr-{{name}}'

{{Name}}(.config(label: 'Hello'))
```

## Develop

```sh
npm install
layr dev            # addon gallery: every example at every design frame
layr analyze
layr pack           # validate and pack
layr publish        # validate, then npm publish
```
