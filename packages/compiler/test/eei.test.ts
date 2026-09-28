import { describe, expect, it } from "vitest";
import { compileProject } from "../src/index.ts";

const page = `Page(.name(Store) .route('/') Scaffold(.body(Container(.id(card) .config(padding: all(16)) .obj(Text('x'))))))`;
const codes = (text: string) => compileProject([{ path: "src/pages/index.layr", text: `${page}\n${text}` }]).diagnostics.map((d) => d.code);

describe("Export/Extract/Inject", () => {
  it("refuses an Inject that reads an unordered Extract of the feature it writes", () => {
    expect(codes("Extract(.from(Store.card) insets base = card.padding)\nInject(.into(Store.card) .exeOrder(0) card.padding = base * 2)")).toContain("L3203");
  });
  it("accepts the same Inject when the Extract reads below it", () => {
    expect(codes("Extract(.from(Store.card) .exeOrder(-1) insets base = card.padding)\nInject(.into(Store.card) .exeOrder(0) card.padding = base * 2)")).not.toContain("L3203");
  });
  it("accepts an unordered Extract of a feature no Inject writes", () => {
    expect(codes("Extract(.from(Store.card) insets base = card.padding)\nInject(.into(Store.card) .exeOrder(0) card.color = #ff0000)")).not.toContain("L3203");
  });
});

describe("Inject targets and exeOrder", () => {
  const withId = `Page(.name(Room) .route('/') Scaffold(.body(Column(Column(Text(.id(txtChg) .obj('This week')), Row(Text('a')))))))`;
  const compile = (inject: string) => {
    const r = compileProject([{ path: "src/pages/index.layr", text: `${withId}\n${inject}` }]);
    return { js: r.modules.get("src/pages/index.layr")?.js ?? "", diags: r.diagnostics };
  };
  it("a target reached by a path answers to the written name and to its id", () => {
    for (const local of ["text", "txtChg"]) {
      const { js, diags } = compile(`Inject(.exeOrder(-5) .into(Room.scaffold.column.column.text) ${local}.color = #ff0000\n${local}.obj = 'Changed')`);
      expect(diags.filter((d) => d.severity === "error")).toEqual([]);
      expect(js).toContain('{ a: "Room::txtChg", k: "color", o: -5');
      expect(js).toContain('{ a: "Room::txtChg", k: "obj", o: -5');
    }
  });
  it("names the target when an assignment misses it", () => {
    const { diags } = compile("Inject(.into(Room.scaffold.column.column.text) card.color = #ff0000)");
    expect(diags.find((d) => d.code === "L3301")?.message).toMatch(/`text` or `txtChg`/);
  });
  it("takes any constant integer, signed either way, and the short forms", () => {
    for (const [order, o] of [["-9999", "-9999"], ["+3", "3"], ["- 5", "-5"], ["-0", "0"], ["2147483647", "2147483647"]]) {
      const { js, diags } = compile(`Inject(.into(Room.txtChg) .exeOrder(${order}) txtChg.color = #ff0000)`);
      expect(diags.filter((d) => d.severity === "error")).toEqual([]);
      expect(js).toContain(`k: "color", o: ${o},`);
    }
    for (const alias of ["exeOrd", "eOrd", "eO"]) {
      const { js, diags } = compile(`Inject(.into(Room.txtChg) .${alias}(7) txtChg.color = #ff0000)`);
      expect(js).toContain('k: "color", o: 7,');
      expect(diags.find((d) => d.code === "L1011")?.message).toBe(`\`.${alias}\` is written \`.exeOrder\`.`);
    }
  });
});

describe("lookup paths into widget instances", () => {
  const files = (inject: string) => [
    { path: "src/widgets/tag.layr", text: "Widget(.name(Tag) .param(txt label = '') .obj(Row(Text(.obj(param.label)), Text(.obj('!')))))" },
    { path: "src/pages/index.layr", text: `import { Tag } from '../widgets/tag.layr'\nPage(.name(P) .route('/') Scaffold(.body(Column(Tag(.config(label: 'a')), Tag(.config(label: 'b'))))))\n${inject}` },
  ];
  it("address one instance's inner object, naming the widget's root or not", () => {
    for (const path of ["P.scaffold.body.column.tag(1).row.text(0)", "P.scaffold.body.column.tag(1).text(0)"]) {
      const r = compileProject(files(`Inject(.into(${path}) .exeOrder(0) text.color = #ff0000)`));
      expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
      const js = r.modules.get("src/pages/index.layr")?.js ?? "";
      expect(js).toMatch(/a: "P::[^"]*>[^"]*text/);
      // The addressed instance passes its address into the widget, and the widget's inner text uses it.
      expect(js).toContain("$a:");
      expect(r.modules.get("src/widgets/tag.layr")?.js).toContain("ip: $p.$a");
    }
  });
});

describe("objects and params through Export/Extract/Inject", () => {
  const store = `Widget(.name(Tag) .param(txt label = '') .obj(Row(Text(.obj(param.label)), Container(.obj(.obj)))))
Page(
  .name(Store)
  .route('/')
  %FUNCTIONS%
  Scaffold(
    .bar(Text('Bar'))
    .body(Container(.id(card) .obj(Column(
      Text(.id(title) .obj('Order 1042'))
      Text('Two items')
      Tag(.id(tag) .config(label: 'new') .obj(Text('inner')))
    ))))
  )
)`;
  const compile = (text: string, functions = "") => {
    const r = compileProject([{ path: "src/pages/index.layr", text: `${store.replace("%FUNCTIONS%", functions)}\n${text}` }]);
    return { js: r.modules.get("src/pages/index.layr")?.js ?? "", errors: r.diagnostics.filter((d) => d.severity === "error").map((d) => d.code) };
  };

  it("a path ending on a slot names the slot: Text content by id and by path", () => {
    for (const [inject, address] of [
      ["Inject(.into(Store.title) title.obj = 'Shipped')", "Store::title"],
      ["Inject(.into(Store.card.column.text(1)) text.obj = 'Arrives Tuesday')", "Store::card.column(0).text(1)"],
    ]) {
      const { js, errors } = compile(inject as string);
      expect(errors).toEqual([]);
      expect(js).toContain(`{ a: "${address}", k: "obj"`);
      // The target is addressable, so its object renders through the cascade.
      expect(js).toContain(`a: "${address}"`);
    }
  });

  it("obj and objs name the default slot; named slots name themselves", () => {
    expect(compile("Inject(.into(Store.card.column) column.obj = [Text('a'), Text('b')])").js).toContain('k: "objs"');
    expect(compile("Inject(.into(Store.card.column) column.objs = [Text('a'), Text('b')])").js).toContain('k: "objs"');
    expect(compile("Inject(.into(Store.scaffold) scaffold.obj = Text('Body'))").js).toContain('k: "body"');
    expect(compile("Inject(.into(Store.scaffold) scaffold.bar = null)").js).toContain('k: "bar"');
  });

  it("objects written as values compile like layout objects", () => {
    const { js, errors } = compile("Inject(.into(Store.card) card.obj = Text(.config(size: 20) .obj('Replaced')))");
    expect(errors).toEqual([]);
    expect(js).toMatch(/k: "obj", o: null, f: \(\$prev\) => \$j\(\$\.N, \{ w: "Text"[^}]*children: "Replaced"/);
  });

  it("Text content takes text, not an object (L1007)", () => {
    expect(compile("Inject(.into(Store.title) title.obj = Text('x'))").errors).toContain("L1007");
    expect(compile("", "Function(.name(f) .def(.exe(title.obj = Text('x'))))").errors).toContain("L1007");
  });

  it("a path that continues past a slot still descends into it", () => {
    const { js, errors } = compile("Inject(.into(Store.card.obj.column.text(1)) text.color = #ff0000)");
    expect(errors).toEqual([]);
    expect(js).toContain('a: "Store::card.column(0).text(1)", k: "color"');
  });

  it("Extract reads a slot; an object slot that LAYR reads is published", () => {
    const text = compile("Extract(.from(Store.title) txt t = title.obj)");
    expect(text.errors).toEqual([]);
    expect(text.js).toContain('$.read("Store::title", "obj")');
    expect(compile("Extract(.from(Store.card) obj o = card.obj)").js).toMatch(/a: "Store::card"[^)]*xs: \["obj"\]/);
  });

  it("a Function writes a slot, in LAYR steps and in TypeScript", () => {
    const steps = compile("", "Function(.name(ship) .def(.exe(title.obj = 'Shipped')))");
    expect(steps.errors).toEqual([]);
    expect(steps.js).toContain('$.write("Store::title", "obj", "Shipped")');
    const ts = compile("", "Function(.name(ship) .def { title.obj = 'Shipped'; card.objs = null })");
    expect(ts.errors).toEqual([]);
    expect(ts.js).toContain(`$.write("Store::title", "obj", 'Shipped')`);
    // `objs` on a Container is its one default slot, `obj`.
    expect(ts.js).toContain(`$.write("Store::card", "obj", null)`);
  });

  it("widget instances take injected params and objects", () => {
    const p = compile("Inject(.into(Store.tag) tag.label = 'hot')\nInject(.into(Store.tag) tag.obj = Text('swapped'))");
    expect(p.errors).toEqual([]);
    expect(p.js).toContain('{ a: "Store::tag", k: "label"');
    expect(p.js).toContain('{ a: "Store::tag", k: "obj"');
    // Widgets resolve their params through the cascade.
    expect(p.js).toContain("$p = $.useParams($p, {");
  });
});

describe("measured features", () => {
  const page = "Page(.name(S) .route('/') Scaffold(.body(Column(Text(.id(title) .obj('Room B')), Container(.id(box) .config(w: 40, h: 40))))))";
  const errors = (inject: string) => compileProject([{ path: "src/pages/index.layr", text: `${page}\n${inject}` }]).diagnostics.filter((d) => d.severity === "error").map((d) => d.code);
  it("size changes the object's own size key (a Text's font size); pos and visible stay read-only", () => {
    expect(errors("Inject(.into(S.title) title.size = 26)")).toEqual([]);
    expect(errors("Inject(.into(S.box) box.size = 80)")).toEqual([]);
    expect(errors("Inject(.into(S.box) box.pos = 3)")).toContain("L3104");
    expect(errors("Inject(.into(S.box) box.visible = false)")).toContain("L3104");
  });
});

describe("rendered features", () => {
  it("keep optional chaining on their members", () => {
    const r = compileProject([{ path: "src/pages/index.layr", text: "Page(\n  .name(S)\n  .route('/')\n  Scaffold(.body(Column(\n    Container(.id(box) .config(w: 200, h: 40))\n    Text('${S.box.size?.w ?? 0}')\n  )))\n)" }]);
    expect(r.modules.get("src/pages/index.layr")?.js).toContain(`$.read("S::box", "size")?.w`);
  });
});
