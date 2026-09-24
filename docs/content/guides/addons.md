---
title: Addons
description: Use addons, create them, test them, and publish them to npm.
order: 40
---

# Addons

An addon is an npm package of LAYR widgets. Core LAYR holds meaning and mechanics (layout, Design Scale, state, motion, accessibility); addons hold appearance and opinions: styled kits, showpiece components, design systems, integrations.

## Use an addon

```sh
npx layr add kit
npx layr add @someone/layr-glass@^1.2.0
```

`layr add` resolves the addon (by its LAYR id through the [Library](/library), or by npm name), checks that it supports your LAYR version, installs it with your package manager and records it in `layr.yaml`. Then import its widgets:

```layr noexec
import { Card, PrimaryButton } from '@dynshift/layr-kit'

Page(
  .name(Home)
  Scaffold(
    .body(Card(.config(title: 'Hello') .obj(PrimaryButton(.config(label: 'Go')))))
  )
)
```

Addons ship `.layr` source that your compiler compiles with your app: they get the same checks, the same static CSS and only what you use ends up in the bundle. Other commands: `layr remove`, `layr update`, `layr outdated`, `layr search <query>`, `layr info <addon>`, and `layr eject <addon>` to copy an addon's source into your project so you can edit it.

## Create an addon

```sh
npx @dynshift/layr create addon glass
cd glass
npm install
npx layr dev
```

```text
glass/
  package.json        npm package with a "layr" manifest
  layr.yaml           kind: addon
  src/index.layr      the addon's widgets
  examples/*.layr     example pages: the addon gallery
  .github/workflows/  CI and release (npm publish with provenance)
```

The `layr` field in `package.json`:

```json
"layr": {
  "id": "glass",
  "kind": "component",
  "layr": "^3.0.0",
  "entry": "./src/index.layr",
  "categories": ["components"],
  "tags": ["glassmorphism"],
  "examples": "./examples"
}
```

- `id`: snake_case, what people type in `layr add`.
- `layr`: the LAYR versions the addon supports (a semver range).
- `entry`: the `.layr` file whose widgets are the addon's public API.

`layr dev` serves the examples; `layr test` screenshots them at every design frame; `layr docs` writes `docs/API.md` from your widgets' params.

## Publish

```sh
npx layr pack       # validate: manifest, analyzer, LAYR range, contents, no install scripts
npx layr publish    # validate, then npm publish
```

Publishing is plain npm: your package, your scope, your account. From CI, the template's `release.yml` publishes with npm provenance when you push a `v*` tag.

To list an addon in the [Library](/library) on layr.dynshift.com, open a pull request adding one file to the catalogue in the LAYR repository. See [Library: publish](/library/publish).

## Rules for addons

- Ship `.layr` source; no install scripts; under 5 MB.
- Declare `@dynshift/layr` as a peer dependency.
- Keep widgets unstyled only where the core already is; addons are where opinions live.
