import { describe, expect, it } from "vitest";
import { COMMANDS } from "../src/cli.ts";
import { formatDiagnostic } from "../src/vite.ts";

describe("cli", () => {
  it("offers the documented commands", () => {
    for (const name of ["create", "dev", "build", "preview", "format", "analyze", "explain", "test", "add", "pack", "publish", "skills", "lsp", "mcp"]) {
      expect(COMMANDS[name], name).toBeDefined();
      expect(COMMANDS[name]?.summary.length).toBeGreaterThan(0);
    }
  });
  it("formats a diagnostic with its code, location and a caret under the problem", () => {
    const text = "Page(.name(P) Scaffold(.body(Text(.config(widht: 3)))))";
    const start = text.indexOf("widht");
    const out = formatDiagnostic({ code: "L1002", severity: "error", message: "no key", span: { start, end: start + 5 }, file: "src/pages/p.layr" }, text, process.cwd());
    expect(out).toContain("error L1002: no key");
    expect(out).toContain("src/pages/p.layr:1:");
    expect(out).toMatch(/\^{5}/);
  });
});
