---
title: Quick start
description: Create a LAYR app, run it, and build a static site.
order: 2
---

# Quick start

You need Node 20 or newer.

```sh
npx @dynshift/layr create my-app
cd my-app
npm install
npx layr dev
```

Open the address it prints. Edit `src/pages/index.layr` and save; the page reloads.

## The project

```text
my-app/
  layr.yaml            project settings (name, addons, access rules)
  index.html           the HTML shell
  src/
    app.layr           design frames and theme
    pages/index.layr   the home page (route /)
```

Every file in `src/pages/` is a page. Its route comes from its path (`src/pages/about.layr` is `/about`) unless it sets `.route(...)`.

## Check, format, build

```sh
npx layr analyze   # every diagnostic, with explanations
npx layr format    # canonical form
npx layr build     # static site in dist/, every route prerendered
npx layr preview   # serve dist/
```

`layr build` output is plain static files. Host it anywhere: GitHub Pages, Cloudflare Pages, Netlify, any web server. See [Deploy](/docs/deploy).

## Editor

Install the **LAYR** extension for VS Code (publisher `dynshift`) for diagnostics, completion, hover docs and format on save.

## AI agents

```sh
npx layr skills install
```

This gives Claude Code (and other agents that read `AGENTS.md`) the LAYR Skill, so they write LAYR instead of guessing from React or Flutter. See [AI agents](/docs/ai).
