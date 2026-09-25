import { beforeEach, describe, expect, it, vi } from "vitest";
import { all } from "@layr-internal/model";
import { atFrame, configureFrames, currentFrame, frames } from "../src/frames.ts";
import * as registry from "../src/registry.ts";
import * as router from "../src/router.ts";
import { batch, computed, effect, signal } from "../src/signals.ts";

describe("signals", () => {
  it("computeds recompute lazily and effects re-run", () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computed(() => a.get() + b.get());
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(sum.get());
    });
    a.set(10);
    b.set(20);
    expect(seen).toEqual([3, 12, 30]);
    stop();
    a.set(0);
    expect(seen).toEqual([3, 12, 30]);
  });

  it("batches notifications", () => {
    const a = signal(1);
    const runs = vi.fn();
    effect(() => {
      a.get();
      runs();
    });
    batch(() => {
      a.set(2);
      a.set(3);
    });
    expect(runs).toHaveBeenCalledTimes(2);
  });

  it("detects bind cycles", () => {
    let b: ReturnType<typeof computed<number>> | null = null;
    const a = computed((): number => (b as ReturnType<typeof computed<number>>).get() + 1);
    b = computed(() => a.get() + 1);
    expect(() => a.get()).toThrow(/cycle/);
  });
});

describe("Export / Extract / Inject registry", () => {
  beforeEach(() => registry.resetRegistry());

  it("applies layers in exeOrder and reverts when a layer is removed", () => {
    registry.declare({ "P::card": { padding: all(10) } });
    const off0 = registry.addLayer({ a: "P::card", k: "padding", o: 0, f: (p) => ({ ...(p as object), top: 99 }) });
    const off1 = registry.addLayer({ a: "P::card", k: "padding", o: 1, f: (p) => ({ ...(p as object), left: 1 }) });
    expect(registry.read("P::card", "padding")).toMatchObject({ top: 99, left: 1, right: 10 });
    // Extract below exeOrder 0 sees the original.
    expect(registry.read("P::card", "padding", 0)).toMatchObject({ top: 10, left: 10 });
    expect(registry.read("P::card", "padding", 1)).toMatchObject({ top: 99, left: 10 });
    off0();
    expect(registry.read("P::card", "padding")).toMatchObject({ top: 10, left: 1 });
    off1();
    expect(registry.read("P::card", "padding")).toEqual(all(10));
  });

  it("orders unordered layers after ordered ones, by registration", () => {
    registry.declare({ "P::x": { w: 1 } });
    registry.addLayer({ a: "P::x", k: "w", o: null, f: (p) => (p as number) * 10 });
    registry.addLayer({ a: "P::x", k: "w", o: 5, f: (p) => (p as number) + 1 });
    expect(registry.read("P::x", "w")).toBe(20);
  });

  it("writes set the base below layers", () => {
    registry.declare({ "P::x": { w: 1 } });
    registry.addLayer({ a: "P::x", k: "w", o: 0, f: (p) => (p as number) * 2 });
    registry.write("P::x", "w", 5);
    expect(registry.read("P::x", "w")).toBe(10);
  });

  it("refuses !mut and rendered features at runtime", () => {
    const warn = vi.fn();
    registry.setWarn(warn);
    registry.immutable({ "P::x": ["color"] });
    registry.declare({ "P::x": { color: "red" } });
    registry.addLayer({ a: "P::x", k: "color", o: 0, f: () => "blue" });
    registry.write("P::x", "color", "green");
    registry.write("P::x", "size", 1);
    expect(registry.read("P::x", "color")).toBe("red");
    expect(warn).toHaveBeenCalledTimes(3);
    // force overrides !mut
    registry.addLayer({ a: "P::x", k: "color", o: 0, f: () => "blue", force: true });
    expect(registry.read("P::x", "color")).toBe("blue");
  });

  it("drops !mut so later layers apply, and restores it", () => {
    registry.setWarn(vi.fn());
    registry.immutable({ "P::x": ["color"] });
    registry.declare({ "P::x": { color: "red" } });
    registry.addLayer({ a: "P::x", k: "color", o: 0, f: () => "blue" });
    registry.mutable({ "P::x": ["color"] });
    expect(registry.isImmutable("P::x", "color")).toBe(false);
    expect(registry.read("P::x", "color")).toBe("red");
    const off = registry.addLayer({ a: "P::x", k: "color", o: 0, f: () => "blue" });
    expect(registry.read("P::x", "color")).toBe("blue");
    off();
    registry.immutable({ "P::x": ["color"] });
    registry.addLayer({ a: "P::x", k: "color", o: 0, f: () => "blue" });
    expect(registry.read("P::x", "color")).toBe("red");
  });

  it("explains the cascade", () => {
    registry.declare({ "P::x": { w: 1 } });
    registry.addLayer({ a: "P::x", k: "w", o: 0, f: (p) => (p as number) + 1, src: "a.layr:3" });
    expect(registry.explain("P::x", "w")).toEqual([
      { kind: "declared", value: 1 },
      { kind: "layer", value: 2, order: 0, src: "a.layr:3" },
    ]);
  });
});

describe("router", () => {
  it("matches the most specific route and builds hrefs", () => {
    router.page({ name: "Home", route: "/", component: null });
    router.page({ name: "Post", route: "/posts/:id", component: null });
    router.page({ name: "New", route: "/posts/new", component: null });
    expect(router.match("/posts/new")?.page.name).toBe("New");
    expect(router.match("/posts/42")).toMatchObject({ page: { name: "Post" }, params: { id: "42" } });
    expect(router.match("/")?.page.name).toBe("Home");
    expect(router.match("/nope")).toBeNull();
    expect(router.hrefFor("Post", { id: 7, tab: "c" })).toBe("/posts/7?tab=c");
  });
});

describe("frames", () => {
  it("steps per-frame values to the widest frame at or below the active one", () => {
    configureFrames({ frames: [{ name: "m", w: 390, h: 844, from: 0, handheld: true }, { name: "t", w: 834, h: 1194, from: 600, handheld: true }, { name: "w", w: 1440, h: 900, from: 1024, handheld: false }], scale: { lo: 0.9, hi: 1.15 }, font: { lo: 0.95, hi: 1.1, alpha: 0.5, tightInLandscape: true } });
    currentFrame.set({ name: "t", w: 834 });
    expect(atFrame(frames({ m: 1, w: 3 }))).toBe(1);
    currentFrame.set({ name: "w", w: 1440 });
    expect(atFrame(frames({ m: 1, w: 3 }))).toBe(3);
  });
});
