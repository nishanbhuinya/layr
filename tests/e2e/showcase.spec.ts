import { expect, type Page, test } from "@playwright/test";

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

test("home renders widgets and navigates", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Showcase" })).toBeVisible();
  await expect(page.getByText("Params become config keys")).toBeVisible();
  await page.getByRole("link", { name: "Layout" }).click();
  await expect(page).toHaveURL(/\/layout$/);
  await expect(page.getByRole("heading", { name: "Layout" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Showcase" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Export / Extract / Inject: reversible layers, ordered reads, writes, !mut", async ({ page }) => {
  const errors = collectErrors(page);
  const warnings: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "warning") warnings.push(m.text());
  });
  await page.goto("/eei");
  const target = page.locator('[data-a="EEI::target"]');
  const pad = async () => Number.parseFloat(await target.evaluate((el) => getComputedStyle(el).paddingTop));
  const base = await pad();
  expect(base).toBeGreaterThan(5);
  await expect(page.getByLabel("original")).toHaveText(/original: \(10, 10, 10, 10\)/);

  await page.getByRole("button", { name: "Toggle inject" }).click();
  await expect(page.getByLabel("injector")).toBeVisible();
  await expect.poll(pad).toBeCloseTo(base * 2, 0);
  await expect(page.getByLabel("current")).toHaveText(/current: \(20, 20, 20, 20\)/);
  // Extract at exeOrder(-1) still sees the value before any injection.
  await expect(page.getByLabel("original")).toHaveText(/original: \(10, 10, 10, 10\)/);

  // Unmounting the host removes its layer: the value reverts.
  await page.getByRole("button", { name: "Toggle inject" }).click();
  await expect.poll(pad).toBeCloseTo(base, 0);
  await expect(page.getByLabel("current")).toHaveText(/current: \(10, 10, 10, 10\)/);

  // Imperative write from a Function.
  const w0 = (await target.boundingBox())?.width ?? 0;
  await page.getByRole("button", { name: "Widen" }).click();
  await expect(page.getByLabel("writes")).toHaveText("writes: 1");
  await expect.poll(async () => (await target.boundingBox())?.width ?? 0).toBeGreaterThan(w0 * 1.4);

  // Lookup path to a sibling reads its measured size.
  await expect(page.getByLabel("sibling")).toHaveText(/sibling path: \(\d+(\.\d+)?, \d+(\.\d+)?\)/);

  // Writing a feature of an object that is not !mut works; `color` on target is not !mut, borderColor is.
  await page.getByRole("button", { name: "Forbidden" }).click();
  await expect.poll(() => target.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 0, 0)");
  expect(errors).toEqual([]);
});

test("layout adapts deterministically", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/layout");
  const chips = page.locator("[data-l=Row]").nth(0);
  const panes = page.locator("[data-l=Row]").nth(1);
  const top = (l: ReturnType<Page["locator"]>) => l.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  // Wide: one line each.
  expect(new Set(await top(chips.locator(":scope > *"))).size).toBe(1);
  expect(new Set(await top(panes.locator(":scope > *"))).size).toBe(1);
  // Narrow: chips wrap, panes stack.
  await page.setViewportSize({ width: 360, height: 900 });
  await expect.poll(async () => new Set(await top(chips.locator(":scope > *"))).size).toBeGreaterThan(1);
  await expect.poll(async () => new Set(await top(panes.locator(":scope > *"))).size).toBe(2);
  // Back to wide: panes unstack.
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(async () => new Set(await top(panes.locator(":scope > *"))).size).toBe(1);
});

test("per-frame values interpolate between frames", async ({ page }) => {
  const width = async (w: number) => {
    await page.setViewportSize({ width: w, height: 900 });
    return page.locator("[data-l=Container]").filter({ hasNot: page.locator("*") }).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  };
  await page.goto("/layout");
  const fluid = page.locator('[data-a="Layout::fluid"]');
  await page.setViewportSize({ width: 390, height: 900 });
  const atM = (await fluid.boundingBox())?.width ?? 0;
  await page.setViewportSize({ width: 1440, height: 900 });
  const atW = (await fluid.boundingBox())?.width ?? 0;
  await page.setViewportSize({ width: 915, height: 900 });
  const between = (await fluid.boundingBox())?.width ?? 0;
  expect(atM).toBeCloseTo(120, 0);
  expect(atW).toBeCloseTo(480, 0);
  expect(between).toBeGreaterThan(atM + 50);
  expect(between).toBeLessThan(atW - 50);
  void width;
});

test("forms are accessible and two-way bound", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/forms");
  await page.getByLabel("Name").fill("Ada");
  await page.getByLabel("I agree").check();
  await page.getByLabel("Size").selectOption("L");
  await expect(page.getByLabel("summary")).toHaveText("Ada / true / L / 40");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("dialog text")).toHaveText("Sent: Ada");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(errors).toEqual([]);
});

test("effects render", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/effects");
  const masked = page.locator("[data-l=Mask]");
  await expect(masked).toBeVisible();
  const maskImage = await masked.evaluate((el) => {
    const layer = [...el.children].find((c) => (c as HTMLElement).style.visibility !== "hidden") as HTMLElement;
    return layer.style.maskImage || layer.style.getPropertyValue("-webkit-mask-image");
  });
  expect(maskImage).toContain("gradient");
  const cut = page.locator("[data-l=Subtract]");
  const composite = await cut.evaluate((el) => (el.firstElementChild as HTMLElement).style.maskImage || (el.firstElementChild as HTMLElement).style.getPropertyValue("-webkit-mask-image"));
  expect(composite).toContain("svg");
  expect(errors).toEqual([]);
});

test("React components interoperate", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/interop");
  const btn = page.getByRole("button", { name: "React counter" });
  await expect(btn).toHaveText("React counter: 5");
  await btn.click();
  await btn.click();
  await expect(btn).toHaveText("React counter: 7");
  await expect(page.getByLabel("clicks")).toHaveText("changes seen by LAYR: 2");
  expect(errors).toEqual([]);
});

test("Adapt, subtree Design Scale, export groups and exit animations", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/more");
  const shown = page.locator('[data-a="More::adapt"] [data-adapt-shown]');
  await expect(shown.getByText("wide one")).toBeVisible();
  await page.setViewportSize({ width: 360, height: 900 });
  await expect(shown.getByLabel("compact")).toBeVisible();
  await expect(shown.getByText("wide one")).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });

  // Designed at 400 wide inside a 200 wide parent: renders at half width.
  const scaled = page.locator('[data-a="More::scaled"]');
  await expect.poll(async () => Math.round((await scaled.boundingBox())?.width ?? 0)).toBeGreaterThan(90);
  const outer = (await scaled.evaluate((el) => el.closest("[data-l=Container]")?.parentElement?.getBoundingClientRect().width)) ?? 0;
  const inner = (await scaled.boundingBox())?.width ?? 0;
  expect(Math.abs(inner - outer)).toBeLessThan(2);

  await expect(page.getByLabel("doubled")).toHaveText(/doubled: \(240, 60\)/);

  const leaving = page.locator('[data-a="More::leaving"]');
  await expect(leaving).toBeVisible();
  await page.getByRole("button", { name: "Toggle" }).click();
  // Still mounted while the exit animation plays, then replaced.
  await expect(leaving).toBeAttached();
  await expect(page.getByLabel("gone")).toBeVisible({ timeout: 3000 });
  await expect(leaving).not.toBeAttached();
  expect(errors, errors.join("\n")).toEqual([]);
});
