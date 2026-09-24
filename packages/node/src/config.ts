/** Loads `layr.yaml` and `src/app.layr` into a compiler ProjectConfig. */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";
import { DEFAULT_CONFIG, type ProjectConfig, readAppConfig } from "@layr-internal/compiler";
import { parse as parseYaml } from "yaml";

export interface LayrYaml {
  name?: string;
  layr?: string;
  addons?: Record<string, string>;
  units?: { default?: "ds" | "px" };
  access?: { inject?: "default" | "open"; force?: string[] };
  targets?: string[];
  base?: string;
  ssrFrame?: string;
  site?: { url?: string };
  /** Emit lookup paths on every element (data-path). */
  inspect?: boolean;
}

export interface LoadedConfig {
  root: string;
  yaml: LayrYaml;
  project: ProjectConfig;
  appFile: string | null;
  /** Installed addons: package name → { dir (real path), entry (project-relative), manifest }. */
  addons: Map<string, AddonInfo>;
  isAddon: boolean;
}

export interface AddonManifest {
  id: string;
  kind?: string;
  layr?: string;
  entry: string;
  categories?: string[];
  tags?: string[];
  examples?: string;
}

export interface AddonInfo {
  name: string;
  version: string;
  dir: string;
  entry: string;
  manifest: AddonManifest;
}

/** Dependencies whose package.json carries a `layr` manifest. */
export function discoverAddons(root: string): Map<string, AddonInfo> {
  const out = new Map<string, AddonInfo>();
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) return out;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    const dir = join(root, "node_modules", dep);
    const manifestPath = join(dir, "package.json");
    if (!existsSync(manifestPath)) continue;
    const m = JSON.parse(readFileSync(manifestPath, "utf8")) as { version: string; layr?: AddonManifest };
    if (!m.layr?.entry || !m.layr.id) continue;
    const real = realpathSync(dir);
    out.set(dep, { name: dep, version: m.version, dir: real, entry: relative(root, join(real, m.layr.entry)).replace(/\\/g, "/"), manifest: m.layr });
  }
  return out;
}

export function loadConfig(root: string, runtimeOverride?: { runtime: string; values: string }): LoadedConfig {
  const yamlPath = join(root, "layr.yaml");
  const yaml: LayrYaml = existsSync(yamlPath) ? ((parseYaml(readFileSync(yamlPath, "utf8")) as LayrYaml | null) ?? {}) : {};
  const appPath = join(root, "src", "app.layr");
  const appFile = existsSync(appPath) ? appPath : null;
  const app = readAppConfig(appFile ? readFileSync(appFile, "utf8") : null);
  const addons = discoverAddons(root);
  const project: ProjectConfig = {
    ...DEFAULT_CONFIG,
    designScale: app.designScale,
    theme: app.theme,
    access: { inject: yaml.access?.inject ?? "default", force: yaml.access?.force ?? [] },
    targets: yaml.targets ?? ["react"],
    inspect: yaml.inspect === true,
    addons: Object.fromEntries([...addons].map(([k, v]) => [k, v.entry])),
    ...(runtimeOverride ?? {}),
  };
  return { root, yaml, project, appFile, addons, isAddon: (yaml as { kind?: string }).kind === "addon" };
}
