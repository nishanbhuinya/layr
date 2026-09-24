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
Before writing LAYR, read \`.claude/skills/layr/SKILL.md\` and the reference it points to. After every change run \`npx layr format\` and \`npx layr analyze --json\`, and fix every diagnostic (\`npx layr explain <code>\` explains one).
${END}`;
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
  console.log(c.dim("MCP (optional): claude mcp add layr -- npx layr mcp"));
}
