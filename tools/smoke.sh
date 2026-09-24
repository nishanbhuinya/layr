#!/usr/bin/env bash
# The package as a user gets it: pack @dynshift/layr, create a project with the packed CLI, install
# the tarball into it, and analyze and build it. Run from the repository root.
set -euo pipefail
work="$(mktemp -d)"
(cd packages/layr && pnpm pack --pack-destination "$work" >/dev/null)
tgz="$(ls "$work"/*.tgz)"
mkdir "$work/tool" && (cd "$work/tool" && npm init -y >/dev/null && npm i "$tgz" --no-audit --no-fund >/dev/null)
(cd "$work" && "$work/tool/node_modules/.bin/layr" create app --template app >/dev/null)
cd "$work/app"
node -e "const f='package.json',p=require('./'+f);p.dependencies['@dynshift/layr']='file:$tgz';require('fs').writeFileSync(f,JSON.stringify(p,null,2))"
npm install --no-audit --no-fund >/dev/null
npx layr analyze
npx layr build
test -f dist/index.html
echo "smoke: packed @dynshift/layr creates, analyzes and builds a project"
