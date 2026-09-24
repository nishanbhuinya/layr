---
title: Publish an addon
description: Build a LAYR addon, publish it to npm, and list it in the Library.
section: Library
---

# Publish an addon

An addon is an npm package that carries LAYR source and a `layr` manifest in its `package.json`. The Library lists official addons and community addons added by pull request.

## Create and develop

```bash
layr create addon glass
cd glass
layr dev
```

`layr dev` in an addon opens its examples at every design frame. Keep the manifest honest: `id`, `kind`, the LAYR range it supports, its entry file and its categories.

## Check and publish

```bash
layr pack --dry-run
layr publish
```

`layr pack` validates the manifest, compiles the addon against the LAYR range it declares and inspects the package contents. `layr publish` runs the same checks and publishes with your npm account. The addon template includes GitHub Actions that publish with npm provenance on a version tag.

## List it in the Library

Open a pull request to [nishanbhuinya/layr](https://github.com/nishanbhuinya/layr) adding one file, `site/content/addons/<id>.yaml`:

```yaml
id: glass
npm: "@your-name/layr-glass"
name: Glass
description: Frosted surfaces with a solid fallback.
repository: https://github.com/your-name/layr-glass
categories: [components]
layr: ^3.0.0
```

Once merged, the Library shows it with its README and install command, and `layr add glass` resolves it through [/addons.json](/addons.json). The repository is the review queue: listings are checked for a working package and an accurate description.
