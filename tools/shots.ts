/**
 * Screenshots of the built site at the design frames, both themes (review aid, not a test).
 * Run with a server on http://localhost:5403: node tools/shots.ts <outDir> [path ...]
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const out = process.argv[2] ?? "shots";
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ["/", "/docs/design-scale", "/playground"];
const frames = [
  { name: "m", width: 390, height: 844 },
  { name: "t", width: 834, height: 1112 },
  { name: "w", width: 1440, height: 900 },
];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const theme of ["dark", "light"] as const) {
  for (const f of frames) {
    const ctx = await browser.newContext({ viewport: { width: f.width, height: f.height }, colorScheme: theme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const p of paths) {
      await page.goto(`http://localhost:5403${p}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      const name = `${theme}-${f.name}-${p.replace(/\//g, "_") || "home"}.png`;
      await page.screenshot({ path: join(out, name), fullPage: false });
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`saved to ${out}`);
