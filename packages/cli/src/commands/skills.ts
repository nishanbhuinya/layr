/** `layr skills install|update|path`: the LAYR Skill for AI agents, matched to the installed LAYR version. */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { type Args, c, CliError } from "../ui.ts";
import { layrVersion } from "../version.ts";

export function skillDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const up of ["..", "../..", "../../..", "../../../.."]) {
    const p = join(here, up, "skills", "layr");
    if (existsSync(join(p, "SKILL.md"))) return p;
  }
  throw new CliError("The LAYR Skill is missing from this installation.");
}

const START = "<!-- layr:start -->";
const END = "<!-- layr:end -->";

function agentsBlock(): string {
  return `${START}
## LAYR

This project uses LAYR (${layrVersion()}), a compiled UI language. It is not React or Flutter; do not write JSX, hooks or Flutter widgets in \`.layr\` files.
Before writing LAYR, read \`.claude/skills/layr/SKILL.md\` and the reference it points to. After every change run \`npx @dynshift/layr format\` and \`npx @dynshift/layr analyze --json\`, and fix every diagnostic (\`npx @dynshift/layr explain <code>\` explains one). Always write the scoped name: it runs this project's installed LAYR, while the unscoped \`npx layr\` can fetch an unrelated npm package.
${END}`;
}

/**
 * The MCP server entry for agents: the project's own LAYR through its scoped name (`npx` runs the
 * installed version; the unscoped `layr` on npm is an unrelated package). Native Windows needs
 * `cmd /c` to start `npx`.
 */
export function mcpServer(platform: string = process.platform): { command: string; args: string[] } {
  const args = ["-y", "@dynshift/layr", "mcp"];
  return platform === "win32" ? { command: "cmd", args: ["/c", "npx", ...args] } : { command: "npx", args };
}

/** Adds the LAYR server to `.mcp.json`, keeping every other server; an unscoped `layr` entry is replaced. */
function writeMcp(cwd: string): "added" | "updated" | "kept" | "unreadable" {
  const file = join(cwd, ".mcp.json");
  let doc: { mcpServers?: Record<string, { command?: string; args?: string[] }> } = {};
  if (existsSync(file)) {
    try {
      doc = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      return "unreadable";
    }
  }
  const servers = (doc.mcpServers ??= {});
  const old = servers.layr;
  if (old?.args?.includes("@dynshift/layr")) return "kept";
  servers.layr = mcpServer();
  writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  return old ? "updated" : "added";
}

export async function skills(args: Args) {
  const action = args._[0] ?? "install";
  const src = skillDir();
  if (action === "path") {
    console.log(src);
    return;
  }
  if (action !== "install" && action !== "update") throw new CliError("Usage: layr skills [install|update|path]");
  const cwd = process.cwd();
  const dest = join(cwd, ".claude", "skills", "layr");
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  writeFileSync(join(dest, ".layr-version"), `${layrVersion()}\n`);
  const agents = join(cwd, "AGENTS.md");
  const current = existsSync(agents) ? readFileSync(agents, "utf8") : "";
  const block = agentsBlock();
  const next = current.includes(START) ? current.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block) : `${current}${current && !current.endsWith("\n") ? "\n" : ""}${current ? "\n" : ""}${block}\n`;
  writeFileSync(agents, next);
  console.log(`${c.green("✓")} LAYR Skill ${layrVersion()} → ${relative(cwd, dest)}`);
  console.log(`${c.green("✓")} ${current.includes(START) ? "updated" : "added"} the LAYR section in AGENTS.md`);
  const mcp = writeMcp(cwd);
  const server = mcpServer();
  if (mcp === "unreadable") console.log(c.yellow(`! .mcp.json is not valid JSON, so it was left alone. Add: "layr": ${JSON.stringify(server)}`));
  else console.log(`${c.green("✓")} ${mcp === "kept" ? "kept" : mcp} the LAYR MCP server in .mcp.json ${c.gray(`(${server.command} ${server.args.join(" ")})`)}`);
}
