// Renders the site's brand files into site/public from their sources in site/brand: the icon set
// (from icon.svg) and the link-preview card (og.html, 1200×630). Run after changing either:
//   node tools/brand.ts
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = join(import.meta.dirname, "..");
const brand = join(root, "site", "brand");
const out = join(root, "site", "public");
mkdirSync(out, { recursive: true });

const svg = readFileSync(join(brand, "icon.svg"), "utf8");
// The maskable icon fills its square and keeps the glyph inside the safe zone (the middle 80%).
const tile = /<rect width="64" height="64" rx="15"[^>]*\/>/;
const glyph = svg.replace(/^[\s\S]*?<\/title>/, "").replace(tile, "").replace(/<\/svg>\s*$/, "");
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${(tile.exec(svg)?.[0] ?? "").replace(' rx="15"', "")}<g transform="translate(32 32) scale(0.8) translate(-32 -32)">${glyph}</g></svg>`;

const browser = await chromium.launch();
async function png(markup: string, size: number, file: string, background = "transparent") {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0;background:${background}">${markup.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: join(out, file), omitBackground: background === "transparent" });
  await page.close();
}
await png(svg, 32, "favicon-32.png");
await png(svg, 180, "apple-touch-icon.png", "#161412");
await png(svg, 192, "icon-192.png");
await png(svg, 512, "icon-512.png");
await png(maskable, 512, "icon-maskable-512.png", "#161412");
copyFileSync(join(brand, "icon.svg"), join(out, "icon.svg"));

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto(pathToFileURL(join(brand, "og.html")).href);
await og.waitForTimeout(400);
await og.screenshot({ path: join(out, "og.png") });
await browser.close();

writeFileSync(
  join(out, "site.webmanifest"),
  `${JSON.stringify(
    {
      name: "LAYR",
      short_name: "LAYR",
      description: "A compiled UI language: layout authoritative, yet responsive.",
      start_url: "/",
      display: "standalone",
      background_color: "#121110",
      theme_color: "#121110",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    null,
    2,
  )}\n`,
);
console.log("brand files written to site/public");
