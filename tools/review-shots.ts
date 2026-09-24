/**
 * Full-page captures for design review (impeccable finish review): home, docs and playground at
 * desktop and phone widths. Run with the built site served on http://localhost:5403.
 *   node tools/review-shots.ts <outDir>
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const out = process.argv[2] ?? "review";
mkdirSync(out, { recursive: true });
const shots: Array<[string, number, number, string, "dark" | "light"]> = [
  ["desktop", 1440, 900, "/", "dark"],
  ["mobile", 390, 844, "/", "dark"],
  ["desktop-light", 1440, 900, "/", "light"],
  ["docs-desktop", 1440, 900, "/docs/layout", "dark"],
  ["docs-mobile", 390, 844, "/docs/layout", "light"],
  ["playground", 1440, 900, "/playground", "dark"],
];
const browser = await chromium.launch();
for (const [name, width, height, path, colorScheme] of shots) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:5403${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: name !== "playground" });
  await ctx.close();
}
await browser.close();
console.log(`saved to ${out}`);
