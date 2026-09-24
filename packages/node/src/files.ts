import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Every `.layr` file under `dir` (skipping node_modules, dist and dot-folders). */
export function listLayrFiles(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".") || name === "dist") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) listLayrFiles(p, out);
    else if (name.endsWith(".layr")) out.push(p);
  }
  return out;
}
