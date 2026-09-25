/**
 * Opens every page with live previews (docs, API, library) and every playground example in a real
 * browser, and reports each preview that shows an error. Compiling in CI proves a snippet parses;
 * this proves it runs. Needs the site on http://localhost:5403.
 *   node tools/preview-sweep.ts [--only /docs/layout]
 */
import { chromium, type Page } from "playwright";

const BASE = process.env.SITE ?? "http://localhost:5403";
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
const page = await ctx.newPage();

async function links(path: string, prefix: string): Promise<string[]> {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  // Index pages render their lists on the client.
  await page.waitForFunction((pre) => [...document.querySelectorAll("a[href]")].some((a) => (a as HTMLAnchorElement).pathname.startsWith(pre)), prefix, { timeout: 15000 }).catch(() => {});
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => (a as HTMLAnchorElement).pathname));
  return [...new Set(hrefs.filter((h) => h.startsWith(prefix) && h !== prefix))];
}

/** Scrolls every live preview into view, waits for it to run, and collects the error texts. */
async function sweep(p: Page, path: string): Promise<string[]> {
  await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const n = await p.locator(".live-box").count();
  for (let i = 0; i < n; i++) await p.locator(".live-box").nth(i).scrollIntoViewIfNeeded();
  if (!n) return [];
  // Every preview has either rendered or shown an error (the dev server can take a few seconds).
  await p.waitForFunction(() => !document.querySelector(".live-clip[data-loading]"), null, { timeout: 45000 }).catch(() => {});
  await p.waitForTimeout(800);
  return p.$$eval(".live-box", (boxes) =>
    boxes.flatMap((b, i) => {
      const err = b.querySelector(".live-error")?.textContent;
      return err ? [`#${i + 1}: ${err}`] : [];
    }),
  );
}

const pages = only ? [only] : ["/", ...(await links("/docs", "/docs/")), ...(await links("/api", "/api/")), ...(await links("/library", "/library/"))];
let bad = 0;
/** Every "Open in playground" link on the site, with the page it came from. */
const opens = new Map<string, string>();
for (const path of pages) {
  const errors = await sweep(page, path);
  if (errors.length) {
    bad += errors.length;
    console.log(`${path}\n  ${errors.join("\n  ")}`);
  }
  for (const href of await page.$$eval("a.open, a.live-open, a[href^='/playground#']", (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""))) {
    if (href.startsWith("/playground#") && !opens.has(href)) opens.set(href, path);
  }
}

// Each playground link must open code that compiles and runs.
for (const [href, from] of opens) {
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  const err = await page.$$eval(".play .live-error", (es) => es.map((e) => e.textContent).filter(Boolean));
  const problems = await page.$$eval(".problem[data-sev=error]", (es) => es.map((e) => e.textContent?.trim()).filter(Boolean));
  if (err.length) {
    bad += 1;
    console.log(`${from} → playground\n  ${err.join("\n  ")}${problems.length ? `\n  ${problems.slice(0, 3).join("\n  ")}` : ""}`);
  }
}

// Playground examples: pick each one from the menu and read the Problems count and preview error.
if (!only) {
  await page.goto(`${BASE}/playground`, { waitUntil: "networkidle" });
  const options = await page.$$eval("select[aria-label=Examples] option", (os) => os.map((o) => (o as HTMLOptionElement).value));
  for (const v of options) {
    await page.selectOption("select[aria-label=Examples]", v);
    await page.waitForTimeout(2000);
    const err = await page.$$eval(".play .live-error", (es) => es.map((e) => e.textContent).filter(Boolean));
    if (err.length) {
      bad += err.length;
      console.log(`/playground example ${v}\n  ${err.join("\n  ")}`);
    }
  }
}

await browser.close();
console.log(bad ? `\n${bad} failing preview(s)` : `\nall previews ran (${pages.length} pages)`);
process.exit(bad ? 1 : 0);
