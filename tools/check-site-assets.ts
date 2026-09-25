// Fails the site build when a file the page head points at is missing from site/dist: the icons,
// the link-preview image and the web manifest (and the icons the manifest lists). A reference in
// <head> to a file that was never shipped fails silently in browsers and link previews, so the
// build refuses it instead.   node tools/check-site-assets.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "site", "dist");
const html = readFileSync(join(dist, "index.html"), "utf8");
const origin = "https://layr.dynshift.com";

const refs = new Set<string>();
for (const m of html.matchAll(/<link\b[^>]*\brel="(?:icon|apple-touch-icon|manifest)"[^>]*>/g)) {
  const href = /\bhref="([^"]+)"/.exec(m[0])?.[1];
  if (href) refs.add(href);
}
for (const m of html.matchAll(/<meta\b[^>]*\b(?:property|name)="(?:og:image|twitter:image)"[^>]*>/g)) {
  const content = /\bcontent="([^"]+)"/.exec(m[0])?.[1];
  if (content) refs.add(content);
}

const local = (ref: string) => (ref.startsWith(origin) ? ref.slice(origin.length) : ref).replace(/^\//, "").split(/[?#]/)[0] as string;
const missing: string[] = [];
for (const ref of refs) {
  if (/^https?:\/\//.test(ref) && !ref.startsWith(origin)) continue;
  const file = local(ref);
  if (!existsSync(join(dist, file))) missing.push(file);
  else if (file.endsWith(".webmanifest")) {
    const manifest = JSON.parse(readFileSync(join(dist, file), "utf8")) as { icons?: Array<{ src: string }> };
    for (const icon of manifest.icons ?? []) if (!existsSync(join(dist, local(icon.src)))) missing.push(`${local(icon.src)} (listed in ${file})`);
  }
}

if (!refs.size) {
  console.error("site assets: index.html references no icon or preview image; the head tags are gone");
  process.exit(1);
}
if (missing.length) {
  console.error(`site assets: the page head points at files that are not in site/dist:\n  ${missing.join("\n  ")}\nThey come from site/public (node tools/brand.ts) and must be copied to the public repository.`);
  process.exit(1);
}
console.log(`site assets: ${refs.size} head references present`);
