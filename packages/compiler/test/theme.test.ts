import { describe, expect, it } from "vitest";
import { compileProject } from "../src/index.ts";

describe("themes", () => {
  it("emits theme colours as variables, dark overrides and font tokens", () => {
    const app = `App(.theme(Theme(.colors(ink: #0d0d0d, paper: #fdfdfd) .dark(ink: #fdfdfd, paper: #0d0d0d) .font(body: 'Schibsted Grotesk', code: 'JetBrains Mono'))))`;
    const page = `Page(.name(Home) .route('/') Scaffold(.config(color: paper) .body(Text(.config(color: ink.alpha(60%), font: code) .obj('hi')))))`;
    const r = compileProject(
      [
        { path: "src/app.layr", text: app },
        { path: "src/pages/index.layr", text: page },
      ],
      { theme: { colors: { ink: "#0d0d0d", paper: "#fdfdfd" }, dark: { ink: "#fdfdfd", paper: "#0d0d0d" }, fonts: { body: "Schibsted Grotesk", code: "JetBrains Mono" } } },
    );
    expect(r.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    const appCss = r.modules.get("src/app.layr")?.css ?? "";
    expect(appCss).toContain("--layr-color-ink:#0d0d0d");
    expect(appCss).toContain("@media (prefers-color-scheme: dark){:root:not([data-theme=light]) .l-root{--layr-color-ink:#fdfdfd");
    expect(appCss).toContain('--layr-font-code:"JetBrains Mono", ui-monospace');
    const css = r.modules.get("src/pages/index.layr")?.css ?? "";
    expect(css).toContain("background-color:var(--layr-color-paper)");
    expect(css).toContain("color:color-mix(in srgb, var(--layr-color-ink) 60%, transparent)");
    expect(css).toContain("font-family:var(--layr-font-code)");
  });
});
