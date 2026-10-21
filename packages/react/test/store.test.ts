import { describe, expect, it } from "vitest";
import { pageStore, resetSession, signal } from "../src/index.ts";

describe("page state kept for the session", () => {
  it("is created once and kept", () => {
    resetSession();
    let made = 0;
    const store = pageStore("Kept", () => ({ count: signal((made++, 0)) }), ["count"]);
    store().count.set(3);
    expect(store().count.get()).toBe(3);
    expect(made).toBe(1);
  });

  it("is rebuilt when a new version of the page declares more state, keeping shared names", () => {
    resetSession();
    pageStore("Hello", () => ({ count: signal(0) }), ["count"])().count.set(5);
    // The page is edited and run again with the same name: a new `var bool big`.
    const next = pageStore("Hello", () => ({ count: signal(0), big: signal(false) }), ["count", "big"])();
    expect(next.big.get()).toBe(false);
    expect(next.count.get()).toBe(5);
  });

  it("starts over after resetSession", () => {
    pageStore("Again", () => ({ n: signal(0) }), ["n"])().n.set(9);
    resetSession();
    expect(pageStore("Again", () => ({ n: signal(0) }), ["n"])().n.get()).toBe(0);
  });
});
