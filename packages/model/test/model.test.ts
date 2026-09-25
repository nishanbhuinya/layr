import { describe, expect, it } from "vitest";
import { Color } from "../src/color.ts";
import { DEFAULT_DESIGN_SCALE } from "../src/ds.ts";
import { BASE_CSS, canonicalAlign, lower } from "../src/lower.ts";
import { keyOf, widget, WIDGETS } from "../src/schema.ts";
import { all, arith, gradient, gradientCss, lengthCss, only, pct, px, sym, vp } from "../src/values.ts";

const ctx = { frames: new Map(DEFAULT_DESIGN_SCALE.frames.map((f) => [f.name, { from: f.from, w: f.w }])) };

describe("schema", () => {
  it("has unique widget names and aliases", () => {
    const names = WIDGETS.flatMap((w) => [w.name, ...(w.aliases ?? [])]);
    expect(new Set(names).size).toBe(names.length);
  });
  it("has unique keys per widget", () => {
    for (const w of WIDGETS) {
      const keys = w.keys.map((k) => k.name);
      expect(new Set(keys).size, w.name).toBe(keys.length);
    }
  });
  it("resolves aliases", () => {
    expect(widget("Col")?.name).toBe("Column");
    expect(widget("Center")?.name).toBe("Mid");
    expect(keyOf(widget("Container")!, "width")?.name).toBe("w");
    expect(keyOf(widget("Container")!, "x")).toBeUndefined();
  });
});

describe("values", () => {
  it("colours", () => {
    expect(Color.hex("#fff").alpha({ pct: 50 }).toCss()).toBe("#ffffff80");
    expect(Color.hex("#2563eb").alpha(pct(12)).toCss()).toBe("#2563eb1f");
    expect(Color.hex("#000").alpha(0.5).toCss()).toBe("#00000080");
    expect(Color.hex("#000").mix(Color.hex("#fff"), pct(50)).toCss()).toBe("#808080");
    expect(Color.hex("#ffffff").shade(2).toCss()).toBe("#d6d6d6");
    expect(Color.hex("#000000").invert.toCss()).toBe("#ffffff");
    expect(Color.argb(0xff0d0d0d).toCss()).toBe("#0d0d0d");
  });
  it("insets arithmetic", () => {
    expect(arith("*", all(20), 2)).toEqual(all(40));
    expect(arith("+", all(20), all(1))).toEqual(all(21));
    expect(sym(20, 10)).toMatchObject({ top: 10, left: 20 });
    expect(only({ start: 4 })).toMatchObject({ left: 4, logical: true });
  });
  it("gradients", () => {
    const g = gradient("linear", [Color.hex("#000"), Color.hex("#fff")], { from: "midLeft", to: "bottomRight", stops: [-0.3, 0.8] });
    expect(gradientCss(g)).toBe("linear-gradient(116.565051deg, #000000 -30%, #ffffff 80%)");
  });
});

describe("alignment spellings", () => {
  it.each([
    ["topMid", "topMid"],
    ["tM", "topMid"],
    ["lM", "midLeft"],
    ["rB", "bottomRight"],
    ["bR", "bottomRight"],
    ["mm", "mid"],
    ["center", "mid"],
    ["tb", null],
  ])("%s → %s", (input, out) => expect(canonicalAlign(input)).toBe(out));
});

describe("lower", () => {
  it("Container", () => {
    const l = lower("Container", { w: 200, h: "fill", color: Color.hex("#0d0d0d"), padding: all(16), cornerRadius: 12, objAlign: "mid" });
    expect([...l.classes].sort()).toEqual(["l", "l-box", "l-hfill", "l-wfix"]);
    expect(l.classes).toContain("l-hfill");
    expect(l.decls).toMatchObject({
      width: "calc(200 * var(--ds) / 1000)",
      "background-color": "#0d0d0d",
      padding: "calc(16 * var(--ds) / 1000)",
      "border-radius": "calc(12 * var(--ds) / 1000)",
      "justify-content": "center",
      "align-items": "center",
    });
  });
  it("Row axis mapping and gap", () => {
    const l = lower("Row", { xAlign: "between", yAlign: "mid", gap: 12 });
    expect(l.decls).toMatchObject({ "justify-content": "space-between", "align-items": "center", gap: "calc(12 * var(--ds) / 1000)" });
    expect(l.notes).toContain("adapt-row");
  });
  it("Column swaps axes", () => {
    const l = lower("Column", { xAlign: "mid", yAlign: "end" });
    expect(l.decls).toMatchObject({ "align-items": "center", "justify-content": "flex-end" });
  });
  it("Text type sets tag and size", () => {
    const l = lower("Text", { type: "h1" });
    expect(l.tag).toBe("h1");
    expect(l.decls["font-size"]).toBe("calc(48 * var(--dsf) / 1000)");
  });
  it("border align out uses outline", () => {
    const l = lower("Container", { borderWidth: 2, borderColor: Color.hex("#000"), borderAlign: "out" });
    expect(l.decls.outline).toBe("calc(2 * var(--ds) / 1000) solid #000000");
    expect(l.decls.border).toBeUndefined();
  });
  it("per-frame numeric values interpolate", () => {
    const l = lower("Container", { w: { $: "frames", values: { m: 100, w: 300 }, step: false } }, ctx);
    expect(l.decls.width).toBe("calc(100 * var(--ds) / 1000)");
    expect(l.media.map((m) => m.media)).toEqual(["(min-width: 390px)", "(min-width: 1440px)"]);
  });
  it("per-frame step values switch at frame boundaries", () => {
    const l = lower("Container", { w: { $: "frames", values: { m: 100, w: 300 }, step: true } }, ctx);
    expect(l.media).toEqual([{ media: "(min-width: 1024px)", decls: { width: "calc(300 * var(--ds) / 1000)" } }]);
  });
  it("px stays absolute", () => {
    expect(lower("Container", { w: px(1) }).decls.width).toBe("1px");
  });
});

describe("runtime table", () => {
  it("matches the schema exactly", async () => {
    const { RUNTIME_TABLE } = await import("../src/table.ts");
    const fromSchema = Object.fromEntries(WIDGETS.map((w) => [w.name, [w.tag, w.layout, ...(w.aliases?.length ? [[...w.aliases]] : [])]]));
    expect(RUNTIME_TABLE).toEqual(fromSchema);
  });
});

describe("text interpolation", () => {
  it("interpolates per-frame font sizes", () => {
    const l = lower("Text", { size: { $: "frames", values: { m: 32, w: 56 }, step: false } }, ctx);
    expect(l.decls["font-size"]).toBe("calc(32 * var(--dsf) / 1000)");
    expect(l.media.map((m) => Object.keys(m.decls)[0])).toEqual(["font-size", "font-size"]);
  });
});

describe("slots", () => {
  it("match the schema, default first", async () => {
    const { SLOTS } = await import("../src/table.ts");
    // Gap(20) and Icon('star') take a positional value, not an object.
    const fromSchema = Object.fromEntries(
      WIDGETS.filter((w) => w.slots.length && w.name !== "Gap" && w.name !== "Icon").map((w) => [w.name, [...w.slots.filter((s) => s.default), ...w.slots.filter((s) => !s.default)].map((s) => s.name)]),
    );
    expect(SLOTS).toEqual(fromSchema);
  });

  it("maps obj/objs to the default slot", async () => {
    const { slotKey } = await import("../src/table.ts");
    expect(slotKey("Column", "obj")).toBe("objs");
    expect(slotKey("Text", "objs")).toBe("obj");
    expect(slotKey("Scaffold", "obj")).toBe("body");
    expect(slotKey("Scaffold", "bar")).toBe("bar");
    expect(slotKey("Box", "obj")).toBe("obj");
    expect(slotKey("Image", "obj")).toBeNull();
    expect(slotKey("Gap", "size")).toBeNull();
  });
});

describe("primary actions", () => {
  it("match the schema", async () => {
    const { PRIMARY_ACTIONS } = await import("../src/table.ts");
    const fromSchema = Object.fromEntries(WIDGETS.filter((w) => w.primaryAction && w.primaryAction !== "press").map((w) => [w.name, w.primaryAction]));
    expect(PRIMARY_ACTIONS).toEqual(fromSchema);
  });
});

describe("theme colours", () => {
  it("compile to CSS variables and keep operations in CSS", () => {
    const ink = Color.token("ink", "#0d0d0d");
    expect(ink.toCss()).toBe("var(--layr-color-ink)");
    expect(ink.alpha({ $: "pct", v: 50 }).toCss()).toBe("color-mix(in srgb, var(--layr-color-ink) 50%, transparent)");
    expect(ink.shade(1).toCss()).toBe("color-mix(in srgb, var(--layr-color-ink), #000000 8%)");
    expect(ink.invert.toCss()).toBe("rgb(from var(--layr-color-ink) calc(255 - r) calc(255 - g) calc(255 - b) / alpha)");
    expect(Color.hex("#ffffff").mix(ink, 0.25).toCss()).toBe("color-mix(in srgb, #ffffff, var(--layr-color-ink) 25%)");
    expect(Color.hex("#ffffff").alpha(0.5).css).toBe(null);
  });
});

describe("per-frame visibility", () => {
  it("switches display per frame instead of using the hide class", () => {
    const l = lower("Column", { hide: { $: "frames", values: { m: true, w: false }, step: true } }, ctx);
    expect(l.classes).not.toContain("l-hide");
    expect(l.decls.display).toBe("none");
    expect(l.media).toEqual([{ media: "(min-width: 1024px)", decls: { display: "flex" } }]);
  });
});

describe("viewport units and mixed arithmetic", () => {
  it("keeps mixed units exact with calc()", () => {
    expect(lengthCss(arith("-", vp(100, "dvh"), 56) as never)).toBe("calc(100dvh - (56 * var(--ds) / 1000))");
    expect(lengthCss(arith("+", px(12), 200) as never)).toBe("calc(12px + (200 * var(--ds) / 1000))");
    expect(arith("+", px(12), px(4))).toEqual({ $: "px", v: 16 });
    expect(lengthCss(arith("*", arith("-", vp(100, "vw"), px(32)), 0.5) as never)).toBe("calc((100vw - 32px) * 0.5)");
  });
});

describe("per-frame visibility from a later frame", () => {
  it("shows the object below the first frame that hides it", () => {
    const l = lower("Button", { hide: { $: "frames", values: { w: true }, step: true } }, ctx);
    expect(l.decls.display).not.toBe("none");
    expect(l.media).toEqual([{ media: "(min-width: 1024px)", decls: { display: "flex" } }].map((m) => ({ ...m, decls: { display: "none" } })));
  });
});

describe("explicit stackAt", () => {
  it("wins over the fill rule for fill children (specificity)", () => {
    expect(BASE_CSS).toContain(".l-row.l-stackable>.l-wfill.l-wfill{");
    const l = lower("Row", { stackAt: 600 }, ctx);
    expect(l.classes).toContain("l-stackable");
    expect(l.notes).not.toContain("adapt-row");
  });
});
