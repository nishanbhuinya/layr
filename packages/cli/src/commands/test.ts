/**
 * `layr test`: builds the app, then screenshots every static route at every design frame and
 * compares with baselines in `tests/frames/`. `--update` writes new baselines.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { findRoot, loadProject } from "../project.ts";
import { type Args, c, CliError, flag } from "../ui.ts";
import { build } from "./core.ts";

export async function test(args: Args) {
  const root = findRoot(process.cwd());
  const p = loadProject(root);
  const frames = p.config.project.designScale.frames;
  const wanted = typeof flag(args, "frames") === "string" ? String(flag(args, "frames")).split(",") : frames.map((f) => f.name);
  const update = !!flag(args, "update");
  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    throw new CliError(`layr test needs Playwright: ${c.bold("npm i -D playwright && npx playwright install chromium")}`);
  }
  await build({ _: [], flags: {} });
  const port = 4300 + Math.floor(Math.random() * 500);
  const server = spawn(process.execPath, [process.argv[1] as string, "preview", "--port", String(port)], { cwd: root, stdio: "ignore" });
  const base = `http://localhost:${port}`;
  try {
    for (let i = 0; i < 50; i++) {
      try {
        if ((await fetch(base)).ok) break;
      } catch {
        /* starting */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    const routes = [...p.result.modules.values()].flatMap((m) => m.pages.map((pg) => pg.route)).filter((r) => !r.includes(":"));
    const browser = await playwright.chromium.launch();
    const dir = join(root, "tests", "frames");
    mkdirSync(dir, { recursive: true });
    let failed = 0;
    let written = 0;
    for (const f of frames.filter((x) => wanted.includes(x.name))) {
      const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      for (const route of routes) {
        await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
        const shot = await page.screenshot({ fullPage: true });
        const name = `${route === "/" ? "index" : route.replace(/^\//, "").replace(/\//g, "__")}@${f.name}.png`;
        const file = join(dir, name);
        if (update || !existsSync(file)) {
          writeFileSync(file, shot);
          written++;
          console.log(`${c.cyan("●")} ${name} ${c.gray("baseline written")}`);
          continue;
        }
        const a = PNG.sync.read(readFileSync(file));
        const b = PNG.sync.read(shot);
        if (a.width !== b.width || a.height !== b.height) {
          failed++;
          console.log(`${c.red("✗")} ${name} size ${a.width}×${a.height} → ${b.width}×${b.height}`);
          writeFileSync(file.replace(/\.png$/, ".actual.png"), shot);
          continue;
        }
        const diff = new PNG({ width: a.width, height: a.height });
        const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
        if (n > a.width * a.height * 0.001) {
          failed++;
          writeFileSync(file.replace(/\.png$/, ".diff.png"), PNG.sync.write(diff));
          writeFileSync(file.replace(/\.png$/, ".actual.png"), shot);
          console.log(`${c.red("✗")} ${name} ${n} pixels differ`);
        } else console.log(`${c.green("✓")} ${name}`);
      }
      if (errors.length) {
        failed += errors.length;
        for (const e of errors) console.log(`${c.red("✗")} ${f.name}: ${e}`);
      }
      await page.close();
    }
    await browser.close();
    if (failed) throw new CliError(`${failed} frame check(s) failed. Inspect tests/frames/*.diff.png, or accept with ${c.bold("layr test --update")}.`);
    console.log(c.green(`✓ ${routes.length} route(s) × ${wanted.length} frame(s)${written ? `, ${written} baseline(s) written` : ""}`));
  } finally {
    server.kill();
  }
}
