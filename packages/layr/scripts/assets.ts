// Copies what the CLI reads at runtime into the package: the LAYR Skill and the project templates.
import { cpSync, rmSync } from "node:fs";

const root = new URL("../../../", import.meta.url);
const here = new URL("../", import.meta.url);
for (const [from, to] of [["skills/layr", "skills/layr"], ["templates", "templates"]] as const) {
  rmSync(new URL(to, here), { recursive: true, force: true });
  cpSync(new URL(from, root), new URL(to, here), { recursive: true, filter: (p) => !/node_modules|[\/]dist[\/]?/.test(p) });
}
cpSync(new URL("LICENSE", root), new URL("LICENSE", here));
console.log("copied skills/layr, templates and LICENSE");
