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

test("Export / Extract / Inject changes objects: Text content, widget params and objects, lists", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/eei");
  // A Text's content is a feature: Extract reads it, a Function writes it.
  await expect(page.getByLabel("status", { exact: true })).toHaveText("Pending");
  await expect(page.getByLabel("status read")).toHaveText("status reads: Pending");
  await page.getByRole("button", { name: "Ship" }).click();
  await expect(page.getByLabel("status", { exact: true })).toHaveText("Shipped");
  await expect(page.getByLabel("status read")).toHaveText("status reads: Shipped");

  // A widget instance's param and `.obj`, and a Column's objects, while the injecting widget is mounted.
  const note = page.locator('[data-a="Card::frame"]').filter({ has: page.getByLabel("note body") });
  const list = page.locator('[data-a="EEI::list"]');
  await expect(note.getByRole("heading")).toHaveText("Note");
  await expect(page.getByLabel("note body")).toHaveText("original body");
  await expect(list).toHaveText("first");
  await page.getByRole("button", { name: "Swap objects" }).click();
  await expect(page.getByLabel("swapper")).toBeVisible();
  await expect(note.getByRole("heading")).toHaveText("Injected title");
  await expect(page.getByLabel("note body")).toHaveText("injected body");
  await expect(list.locator(":scope > *")).toHaveText(["one", "two", "three"]);

  // Unmounting the injecting widget removes its layers: everything reverts.
  await page.getByRole("button", { name: "Swap objects" }).click();
  await expect(note.getByRole("heading")).toHaveText("Note");
  await expect(page.getByLabel("note body")).toHaveText("original body");
  await expect(list.locator(":scope > *")).toHaveText(["first"]);
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

test("wrappers and scroll containers keep layout: Animate in a stacking row, a sideways shelf, a pinned Position", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/layout");
  const anim = page.locator('[data-a="Layout::anim"]');
  const plain = page.locator('[data-l=Row]').nth(1).locator(":scope > *").nth(1);
  // Stacked, the Animate-wrapped fill child keeps its height, exactly like the plain one.
  await expect.poll(async () => Math.round((await anim.boundingBox())?.height ?? 0)).toBe(Math.round((await plain.boundingBox())?.height ?? -1));
  expect((await anim.boundingBox())?.height ?? 0).toBeGreaterThan(30);
  // The shelf's four boxes share one line (the Scroll scrolls instead of the row wrapping).
  const tops = await page.locator('[data-a="Layout::shelf"] > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  // The pinned Position's fill object fills the space between its edges.
  const pinned = await page.locator('[data-a="Layout::pinned"]').boundingBox();
  const stack = await page.locator('[data-a="Layout::pinned"]').evaluate((e) => (e.closest("[data-l=Stack]") as HTMLElement).getBoundingClientRect());
  expect(Math.round(pinned?.width ?? 0)).toBeGreaterThan(Math.round(stack.width * 0.8));
  expect(Math.round(pinned?.height ?? 0)).toBeGreaterThan(Math.round(stack.height * 0.7));
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
  // The mask goes on the object a layer paints (past its Order/Position wrappers), not on the wrapper.
  const maskOf = (sel: string) =>
    page.locator(sel).evaluate((el) => {
      const masked = [el, ...el.querySelectorAll<HTMLElement>("*")].find((e) => (e as HTMLElement).style.maskImage || (e as HTMLElement).style.getPropertyValue("-webkit-mask-image")) as HTMLElement | undefined;
      return masked ? masked.style.maskImage || masked.style.getPropertyValue("-webkit-mask-image") : "";
    });
  await expect.poll(() => maskOf("[data-l=Mask]")).toContain("gradient");
  await expect.poll(() => maskOf("[data-l=Subtract]")).toContain("svg");
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

test("sizes computed from hug and fill: grow, follow content, keep adapting", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/sizes");
  const but = page.locator('[data-a="Sizes::but"]');
  const ds = await but.evaluate((el) => Number.parseFloat(getComputedStyle(el).getPropertyValue("--ds")) / 1000);
  const box = async () => {
    const r = await but.evaluate((el) => ({ w: Number.parseFloat(getComputedStyle(el).width), h: Number.parseFloat(getComputedStyle(el).height) }));
    return r;
  };
  const base = await box();
  expect(base.w).toBeGreaterThan(20);

  // Pressed, it is its hugged size plus 10 on each axis (animated there).
  await but.click();
  await expect.poll(async () => (await box()).w).toBeCloseTo(base.w + 10 * ds, 0);
  await expect.poll(async () => (await box()).h).toBeCloseTo(base.h + 10 * ds, 0);
  // Measuring never feeds back: it stays put.
  await page.waitForTimeout(600);
  expect((await box()).w).toBeCloseTo(base.w + 10 * ds, 0);

  // It still hugs: a longer label makes it wider, still plus 10.
  await page.getByRole("button", { name: "Rename" }).click();
  const text = but.locator(".l-text").first();
  await expect.poll(async () => (await box()).w - (await text.evaluate((el) => (el as HTMLElement).getBoundingClientRect().width))).toBeCloseTo(10 * ds + 10 * ds, 0);

  // Released, it is plain hug again.
  await but.click();
  await expect.poll(async () => (await box()).w - (await text.evaluate((el) => (el as HTMLElement).getBoundingClientRect().width))).toBeCloseTo(10 * ds, 0);

  // `w: hug + 24` chips: 24 wider than their text, and the row still wraps them.
  const chip = page.getByText("alpha", { exact: true });
  const chipBox = chip.locator("..");
  const extra = await chipBox.evaluate((el) => el.getBoundingClientRect().width - (el.firstElementChild as HTMLElement).getBoundingClientRect().width);
  expect(extra).toBeCloseTo(24 * ds, 0);
  const tops = await page.locator('[data-a="Sizes::chips"]').evaluate((el) => [...(el.firstElementChild as HTMLElement).children].map((c) => Math.round(c.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBeGreaterThan(1);

  // `w: fill + 40` next to a plain fill: its share plus 40; the other takes the rest.
  const panes = await page.locator('[data-a="Sizes::panes"]').evaluate((el) => {
    const [a, b] = [...el.children].map((c) => c.getBoundingClientRect().width);
    return { row: el.getBoundingClientRect().width, a: a as number, b: b as number };
  });
  expect(panes.a + panes.b).toBeCloseTo(panes.row, 0);
  expect(panes.a).toBeCloseTo(panes.row / 2 + 40 * ds, 0);
  expect(errors).toEqual([]);
});

test("computed sizes keep adapting at every frame", async ({ page }) => {
  for (const [w, h] of [[390, 844], [834, 1194], [1440, 900], [2560, 1080]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/sizes");
    const ds = await page.locator('[data-a="Sizes::panes"]').evaluate((el) => Number.parseFloat(getComputedStyle(el).getPropertyValue("--ds")) / 1000);
    // Chips that hug plus 24 still wrap inside their 260-wide box.
    const tops = await page.locator('[data-a="Sizes::chips"]').evaluate((el) => [...(el.firstElementChild as HTMLElement).children].map((c) => Math.round(c.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBeGreaterThan(1);
    // The row with a `fill + 40` pane shares when there is room and stacks when there is not, never wider than itself.
    const r = await page.locator('[data-a="Sizes::panes"]').evaluate((el) => ({ stacked: el.classList.contains("l-stacked"), row: el.getBoundingClientRect().width, kids: [...el.children].map((c) => c.getBoundingClientRect()).map((b) => ({ top: b.top, w: b.width })) }));
    const [a, b] = r.kids as [{ top: number; w: number }, { top: number; w: number }];
    if (r.stacked) {
      expect(b.top).toBeGreaterThan(a.top);
      expect(a.w).toBeLessThanOrEqual(r.row + 0.5);
    } else {
      expect(a.top).toBeCloseTo(b.top, 0);
      expect(a.w).toBeCloseTo(r.row / 2 + 40 * ds, 0);
    }
    if (w === 390) expect(r.stacked).toBe(true);
    if (w >= 834) expect(r.stacked).toBe(false);
  }
});
