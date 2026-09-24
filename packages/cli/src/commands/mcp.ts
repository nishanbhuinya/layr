/** `layr mcp`: a Model Context Protocol server so AI agents can use LAYR's own knowledge and checks. */
import { compileProject, format } from "@layr-internal/compiler";
import { CONSTRUCTS, DIAGNOSTIC_BY_CODE, DIAGNOSTICS, WIDGETS, widget } from "@layr-internal/model";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { findRoot, loadProject } from "../project.ts";
import { layrVersion } from "../version.ts";
import { loadIndex } from "./addons.ts";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

export async function mcp() {
  const server = new McpServer({ name: "layr", version: layrVersion() });

  server.tool("list_widgets", "List LAYR core widgets and language constructs with one-line docs.", {}, async () =>
    text([...WIDGETS.map((w) => `${w.name} (${w.module}): ${w.doc}`), ...CONSTRUCTS.map((c) => `${c.name} (construct): ${c.doc}`)].join("\n")),
  );

  server.tool("get_widget", "Full schema for one widget: config keys (type, default, aliases, docs), slots, events and an example.", { name: z.string() }, async ({ name }) => {
    const w = widget(name);
    const c = CONSTRUCTS.find((x) => x.name === name);
    if (!w && !c) return text(`No widget or construct named ${name}. Call list_widgets.`);
    if (c) return text(JSON.stringify(c, null, 2));
    return text(JSON.stringify({ ...w }, null, 2));
  });

  server.tool("explain_error", "Explain a LAYR diagnostic code (e.g. L3102).", { code: z.string() }, async ({ code }) => {
    const d = DIAGNOSTIC_BY_CODE.get(code.toUpperCase());
    return text(d ? JSON.stringify(d, null, 2) : `Unknown code. Known: ${DIAGNOSTICS.map((x) => x.code).join(", ")}`);
  });

  server.tool(
    "check_snippet",
    "Compile a .layr snippet (a whole file) and return its diagnostics. Use after writing LAYR code.",
    { source: z.string(), path: z.string().optional() },
    async ({ source, path }) => {
      const p = path ?? "src/pages/snippet.layr";
      const r = compileProject([{ path: p, text: source }]);
      const diags = r.diagnostics.filter((d) => d.severity !== "info").map((d) => ({ code: d.code, severity: d.severity, message: d.message, at: d.span.start }));
      return text(diags.length ? JSON.stringify(diags, null, 2) : "No errors or warnings.");
    },
  );

  server.tool("format", "Format .layr source in canonical form.", { source: z.string() }, async ({ source }) => {
    const r = format(source);
    return text(r.errors ? `Syntax errors: ${r.errors}. Fix them first (use check_snippet).` : r.text);
  });

  server.tool("analyze_project", "Analyze the LAYR project in the working directory (all files) and return diagnostics.", { cwd: z.string().optional() }, async ({ cwd }) => {
    const p = loadProject(findRoot(cwd ?? process.cwd()));
    const out = p.result.diagnostics.map((d) => {
      const f = p.files.find((x) => x.path === d.file);
      const before = f?.text.slice(0, d.span.start).split("\n") ?? [""];
      return { file: d.file, line: before.length, column: (before.at(-1)?.length ?? 0) + 1, code: d.code, severity: d.severity, message: d.message };
    });
    return text(out.length ? JSON.stringify(out, null, 2) : "No diagnostics.");
  });

  server.tool("search_addons", "Search the LAYR addon catalogue.", { query: z.string() }, async ({ query }) => {
    const q = query.toLowerCase();
    const hits = (await loadIndex()).filter((e) => [e.id, e.name, e.description, ...(e.categories ?? [])].some((s) => s?.toLowerCase().includes(q)));
    return text(hits.length ? JSON.stringify(hits, null, 2) : "No addons found.");
  });

  await server.connect(new StdioServerTransport());
}
