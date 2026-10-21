import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.ts";

const PAGE = `Widget(.name(Tag) .param(req txt label) .obj(Container(.obj(Text(param.label)))))

Page(
  .name(Store)
  .route('/')
  Extract(.from(Store.card) .exeOrder(-1) insets base = card.padding)
  Inject(.into(Store.card) .exeOrder(+2) card.padding = base * 2)
  Scaffold(.body(Container(.id(card) .config(padding: all(8)) Tag(.config(label: 'hot')))))
)
`;

let dir = "";
let cwd = "";
const run = async (...argv: string[]) => {
  const lines: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void lines.push(a.join(" ")));
  const code = await main(argv);
  log.mockRestore();
  return { code, out: lines.join("\n") };
};

beforeAll(() => {
  cwd = process.cwd();
  dir = mkdtempSync(join(tmpdir(), "layr-cli-"));
  writeFileSync(join(dir, "layr.yaml"), "name: t\n");
  writeFileSync(join(dir, "package.json"), '{"name":"t","private":true}');
  mkdirSync(join(dir, "src/pages"), { recursive: true });
  writeFileSync(join(dir, "src/pages/index.layr"), PAGE);
  process.chdir(dir);
});
afterAll(() => {
  process.chdir(cwd);
  rmSync(dir, { recursive: true, force: true });
  process.exitCode = 0;
});

describe("layr chain", () => {
  it("lists the objects operations change and read, then one object's chain in order", async () => {
    const all = await run("chain");
    expect(all.out).toContain("Store.card");
    expect(all.out).toContain("changed by 1");
    expect(all.out).toContain("read by 1");
    const one = await run("chain", "card");
    expect(one.out.indexOf("Extract")).toBeLessThan(one.out.indexOf("Inject"));
    expect(one.out).toContain("+2");
    expect(one.out).toContain("reads what is below -1");
    const json = JSON.parse((await run("eied", "--all", "--json")).out) as Array<{ order: number; kind: string }>;
    expect(json.map((e) => [e.order, e.kind])).toEqual([
      [-1, "Extract"],
      [2, "Inject"],
    ]);
  });
});

describe("layr upgrade", () => {
  it("informs and changes nothing without consent", async () => {
    const check = await run("upgrade", "--check");
    expect(check.out).toContain("A Widget renders `.wgt(...)`");
    expect(check.out).toContain("src/pages/index.layr:1");
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    expect(readFileSync(join(dir, "src/pages/index.layr"), "utf8")).toBe(PAGE);
  });
  it("rewrites and formats with --yes, then has nothing left", async () => {
    await run("upgrade", "--yes");
    const text = readFileSync(join(dir, "src/pages/index.layr"), "utf8");
    expect(text).toContain(".wgt(");
    expect(text).not.toMatch(/Widget\([^]*?\.obj\(Container/);
    expect((await run("upgrade")).out).toContain("Nothing to upgrade");
  });
});
