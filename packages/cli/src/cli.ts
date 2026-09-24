/** The `layr` command. */
import { add, docs, eject, info, outdated, pack, publish, remove, search, update } from "./commands/addons.ts";
import { analyze, build, dev, doctor, explain, fmt, preview } from "./commands/core.ts";
import { create } from "./commands/create.ts";
import { type Args, c, CliError, parseArgs } from "./ui.ts";
import { layrVersion } from "./version.ts";

type Command = { run: (a: Args) => Promise<void>; summary: string; usage?: string };

/** A command loaded on first use. The import is written out so a bundler can follow it. */
const lazy = (load: () => Promise<unknown>, name: string) => async (a: Args) => {
  const m = (await load()) as Record<string, (a: Args) => Promise<void>>;
  await (m[name] as (a: Args) => Promise<void>)(a);
};

export const COMMANDS: Record<string, Command> = {
  create: { run: create, summary: "Create a project or an addon", usage: "layr create <name> [--template app|blank] | layr create addon <name>" },
  dev: { run: dev, summary: "Start the dev server", usage: "layr dev [--port 5173] [--host]" },
  build: { run: build, summary: "Build and prerender a static site into dist/", usage: "layr build [--base /] [--out dist] [--no-prerender]" },
  preview: { run: preview, summary: "Serve the built site", usage: "layr preview [--port 4173]" },
  format: { run: fmt, summary: "Rewrite .layr files in canonical form", usage: "layr format [--check] [paths...]" },
  analyze: { run: analyze, summary: "Check the project; explain a feature's cascade", usage: "layr analyze [--json] [--info] [--explain Page.id.feature]" },
  explain: { run: explain, summary: "Explain a diagnostic code", usage: "layr explain [L3102]" },
  test: { run: lazy(() => import("./commands/test.ts"), "test"), summary: "Screenshot every page at every design frame", usage: "layr test [--frames m,t,w,uw] [--update]" },
  add: { run: add, summary: "Install addons", usage: "layr add <addon>[@range] ..." },
  remove: { run: remove, summary: "Uninstall addons", usage: "layr remove <addon> ..." },
  update: { run: update, summary: "Update addons", usage: "layr update [addon ...]" },
  outdated: { run: outdated, summary: "List addons with newer versions" },
  search: { run: search, summary: "Search addons", usage: "layr search <query>" },
  info: { run: info, summary: "Show an addon's details", usage: "layr info <addon>" },
  pack: { run: pack, summary: "Validate and pack an addon", usage: "layr pack [--dry-run]" },
  publish: { run: publish, summary: "Validate and publish an addon to npm", usage: "layr publish [--dry-run] [--tag next]" },
  eject: { run: eject, summary: "Copy an addon's source into your project", usage: "layr eject <addon>" },
  docs: { run: docs, summary: "Generate API docs for an addon's widgets" },
  skills: { run: lazy(() => import("./commands/skills.ts"), "skills"), summary: "Install the LAYR Skill for AI agents", usage: "layr skills [install|update|path]" },
  doctor: { run: doctor, summary: "Check the environment and project" },
  lsp: { run: lazy(() => import("@layr-internal/lsp"), "start"), summary: "Start the language server (stdio)" },
  mcp: { run: lazy(() => import("./commands/mcp.ts"), "mcp"), summary: "Start the MCP server for AI agents (stdio)" },
};

const ALIASES: Record<string, string> = { fmt: "format", i: "add", install: "add", rm: "remove", uninstall: "remove", upgrade: "update", check: "analyze" };

function help() {
  console.log(`${c.bold("LAYR")} ${c.gray(layrVersion())}  Layout Authoritative Yet Responsive\n`);
  console.log("Usage: layr <command> [options]\n");
  const width = Math.max(...Object.keys(COMMANDS).map((k) => k.length));
  for (const [name, cmd] of Object.entries(COMMANDS)) console.log(`  ${c.bold(name.padEnd(width))}  ${cmd.summary}`);
  console.log(`\n${c.gray("layr <command> --help for details · https://layr.dynshift.com/cli")}`);
}

/** Commands that keep running (servers). */
const LONG_RUNNING = new Set(["dev", "preview", "lsp", "mcp"]);

/** Returns an exit code, or null when the command keeps the process alive. */
export async function main(argv: string[]): Promise<number | null> {
  const args = parseArgs(argv);
  const name0 = args._.shift();
  if (!name0 || name0 === "help" || (!name0 && args.flags.help)) {
    help();
    return 0;
  }
  if (name0 === "version" || args.flags.version || args.flags.v) {
    console.log(layrVersion());
    return 0;
  }
  const name = ALIASES[name0] ?? name0;
  const cmd = COMMANDS[name];
  if (!cmd) {
    console.error(`${c.red("✗")} Unknown command \`${name0}\`.`);
    help();
    return 1;
  }
  if (args.flags.help || args.flags.h) {
    console.log(`${cmd.summary}\n\n  ${cmd.usage ?? `layr ${name}`}`);
    return 0;
  }
  try {
    await cmd.run(args);
    if (LONG_RUNNING.has(name)) return null;
    return typeof process.exitCode === "number" ? process.exitCode : 0;
  } catch (e) {
    if (e instanceof CliError) {
      console.error(`${c.red("✗")} ${e.message}`);
      return e.exitCode;
    }
    throw e;
  }
}
