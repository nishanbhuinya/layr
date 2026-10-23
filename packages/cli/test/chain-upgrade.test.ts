import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.ts";
import { mcpServer } from "../src/commands/skills.ts";
import { codeStep, dependencySpec, installArgs, pickVersion } from "../src/commands/upgrade.ts";

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

describe("layr upgrade --code", () => {
  it("informs and changes nothing without consent", async () => {
    const check = await run("upgrade", "--code", "--check");
    expect(check.out).toContain("A Widget renders `.wgt(...)`");
    expect(check.out).toContain("src/pages/index.layr:1");
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    expect(readFileSync(join(dir, "src/pages/index.layr"), "utf8")).toBe(PAGE);
  });
  it("rewrites and formats with --yes, then has nothing left", async () => {
    await run("upgrade", "--code", "--yes");
    const text = readFileSync(join(dir, "src/pages/index.layr"), "utf8");
    expect(text).toContain(".wgt(");
    expect(text).not.toMatch(/Widget\([^]*?\.obj\(Container/);
    expect((await run("upgrade", "--code")).out).toContain("Nothing to upgrade");
  });
});

describe("layr upgrade: LAYR itself", () => {
  const p = { "dist-tags": { latest: "3.3.0", next: "3.4.0-beta.1" }, versions: { "3.1.0": {}, "3.2.0": {}, "3.2.1": {}, "3.3.0": {}, "3.4.0-beta.1": {} } } as never;
  it("picks the version a tag, a version or a range names", () => {
    expect(pickVersion(p, "latest")).toBe("3.3.0");
    expect(pickVersion(p, "next")).toBe("3.4.0-beta.1");
    expect(pickVersion(p, "3.2")).toBe("3.2.1");
    expect(pickVersion(p, "3.1.0")).toBe("3.1.0");
    expect(pickVersion(p, "9")).toBeNull();
  });
  it("keeps the project's dependency style and field", () => {
    expect(dependencySpec("^3.1.0", "3.3.0")).toBe("^3.3.0");
    expect(dependencySpec("~3.1.0", "3.3.0")).toBe("~3.3.0");
    expect(dependencySpec("3.1.0", "3.3.0")).toBe("3.3.0");
    expect(installArgs("npm", "^3.3.0", true)).toEqual(["install", "@dynshift/layr@^3.3.0", "--save-dev"]);
    expect(installArgs("pnpm", "^3.3.0", false)).toEqual(["add", "@dynshift/layr@^3.3.0"]);
  });
  it("runs the code step the new version has", () => {
    expect(codeStep("3.3.0")).toEqual(["upgrade", "--code"]);
    expect(codeStep("3.2.0")).toEqual(["upgrade"]);
    expect(codeStep("3.1.0")).toBeNull();
  });
});

describe("layr skills install", () => {
  it("points agents and MCP at the scoped package, keeping other MCP servers", async () => {
    writeFileSync(join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { other: { command: "x" }, layr: { command: "npx", args: ["layr", "mcp"] } } }));
    const r = await run("skills", "install");
    expect(r.out).toContain("updated the LAYR MCP server");
    const mcp = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf8"));
    expect(mcp.mcpServers.other).toEqual({ command: "x" });
    expect(mcp.mcpServers.layr.args).toContain("@dynshift/layr");
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toContain("npx @dynshift/layr analyze --json");
    expect((await run("skills", "install")).out).toContain("kept the LAYR MCP server");
    expect(mcpServer("linux")).toEqual({ command: "npx", args: ["-y", "@dynshift/layr", "mcp"] });
    expect(mcpServer("win32").args.slice(0, 2)).toEqual(["/c", "npx"]);
  });
});
