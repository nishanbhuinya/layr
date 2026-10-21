import { beforeEach, describe, expect, it } from "vitest";
import * as registry from "../src/registry.ts";

describe("Duplicate copies in the registry", () => {
  beforeEach(() => registry.resetRegistry());

  it("take the original's layers below the Duplicate's order, then the Duplicate's config, then their own", () => {
    registry.addLayer({ a: "P::card", k: "padding", o: -1, f: () => 16 });
    registry.addLayer({ a: "P::card", k: "color", o: 5, f: () => "blue" });
    registry.mirror("P::dup", "P::card", 1, { radius: 0 });
    expect(registry.overriddenKeys("P::dup").sort()).toEqual(["padding", "radius"]);
    expect(registry.resolve("P::dup", "padding", 4)).toBe(16);
    expect(registry.resolve("P::dup", "color", "beige")).toBe("beige");
    expect(registry.resolve("P::dup", "radius", 12)).toBe(0);
    registry.addLayer({ a: "P::dup", k: "padding", o: 3, f: (v) => (v as number) * 2 });
    expect(registry.resolve("P::dup", "padding", 4)).toBe(32);
  });

  it("without an order follow every layer and write of the original", () => {
    registry.addLayer({ a: "P::card", k: "color", o: 5, f: () => "blue" });
    registry.write("P::card", "padding", 9);
    registry.mirror("P::late", "P::card", null);
    expect(registry.resolve("P::late", "color", "beige")).toBe("blue");
    expect(registry.read("P::late", "padding")).toBe(9);
  });
});
