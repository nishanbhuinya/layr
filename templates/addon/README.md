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
npx layr dev        # addon gallery: every example at every design frame
npx layr analyze
npx layr pack       # validate and pack
npx layr publish    # validate, then npm publish
```
