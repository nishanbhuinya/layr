---
title: Deploy
description: layr build produces a static site with every route prerendered.
order: 41
---

# Deploy

```sh
npx layr build
```

`dist/` now holds a static site: every page without route params is prerendered to HTML (fast first paint, readable by search engines), then becomes interactive in the browser. `404.html` hands unknown paths to the client router. `--base /my-app/` builds for a sub-path.

Any static host works.

## GitHub Pages

```yaml
# .github/workflows/pages.yml
name: Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx layr build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

For a project site at `https://you.github.io/my-app/`, build with `npx layr build --base /my-app/` or set `base: /my-app/` in `layr.yaml`.

## Other hosts

Cloudflare Pages, Netlify and Vercel: build command `npx layr build`, output directory `dist`.
