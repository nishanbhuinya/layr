---
title: Quick start
description: Create a LAYR app, run it, and build a static site.
order: 2
---

# Quick start

You need Node 20 or newer. Install the `layr` command once:

```sh
npm i -g @dynshift/layr
```

Then create a project and start it:

```sh
layr create my-app
cd my-app
npm install
layr dev
```

Inside a project, `layr` always runs the version that project installs, so one global command serves every project, old and new. Without a global install, `npx @dynshift/layr <command>` and the project's scripts (`npm run dev`, `npm run build`) do the same.

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
layr analyze   # every diagnostic, with explanations
layr format    # canonical form
layr build     # static site in dist/, every route prerendered
layr preview   # serve dist/
```

`layr build` output is plain static files. Host it anywhere: GitHub Pages, Cloudflare Pages, Netlify, any web server. See [Deploy](/docs/deploy).

## Editor

[Download the LAYR extension for VS Code](/editor) and install the `.vsix` file with **Extensions → … → Install from VSIX…**. It brings completion that writes whole calls, refactors (wrap, remove, move, extract to a Widget), diagnostics with fixes, hover docs and format on save. It checks each project with the LAYR that project installs; the status bar shows which version.

## Upgrading

```sh
layr upgrade
```

This moves the project to the latest LAYR once you agree: it installs it, updates `layr.yaml` and the Skill, then lists any deprecated forms and rewrites them when you say so. See [CLI](/docs/cli#upgrading).

## AI agents

```sh
layr skills install
```

This gives Claude Code (and other agents that read `AGENTS.md`) the LAYR Skill, so they write LAYR instead of guessing from React or Flutter. See [AI agents](/docs/ai).
