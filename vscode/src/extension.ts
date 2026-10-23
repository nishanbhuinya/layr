import { unwatchFile, watchFile } from "node:fs";
import * as path from "node:path";
import {
  commands,
  type ExtensionContext,
  env,
  RelativePattern,
  StatusBarAlignment,
  type StatusBarItem,
  Uri,
  window,
  type WorkspaceFolder,
  workspace,
} from "vscode";
import { LanguageClient, type LanguageClientOptions, type ServerOptions, TransportKind } from "vscode-languageclient/node";
import { type LayrInstall, resolveProjectLayr } from "../../packages/node/src/install.ts";

/**
 * One language server per LAYR project (each folder with a `layr.yaml`), run by that project's own
 * `@dynshift/layr`: the editor checks, completes and formats by the rules of the version the project
 * builds with. The server bundled with this extension serves `.layr` files outside any project, a
 * project with nothing installed yet, and `"layr.server": "bundled"`.
 */
interface Project {
  root: string;
  install: LayrInstall | null;
  client: LanguageClient;
  watching: string;
}

const projects = new Map<string, Project>();
let loose: LanguageClient | undefined;
let status: StatusBarItem;
let ctx: ExtensionContext;

function bundledVersion(): string {
  return String(ctx.extension.packageJSON.version ?? "");
}

function serverFor(install: LayrInstall | null): ServerOptions {
  if (install) {
    const run = { module: install.bin, args: ["lsp"], transport: TransportKind.stdio, options: { env: { ...process.env, LAYR_DEFERRED: install.version } } };
    return { run, debug: run };
  }
  const run = { module: ctx.asAbsolutePath(path.join("dist", "server.js")), transport: TransportKind.stdio, options: { env: { ...process.env, LAYR_BUNDLED_VERSION: bundledVersion() } } };
  return { run, debug: run };
}

function useProjectServer(): boolean {
  return workspace.getConfiguration("layr").get<string>("server", "project") !== "bundled";
}

async function startClient(name: string, server: ServerOptions, options: LanguageClientOptions): Promise<LanguageClient> {
  const client = new LanguageClient("layr", name, server, options);
  await client.start();
  // Deprecated forms: say what changed and where, and update only when the developer says so.
  // "Not now" holds until the number of places changes.
  client.onNotification("layr/deprecations", async (n: { count: number; files: number; titles: string[]; since: string | null }) => {
    if (!n.count || ctx.workspaceState.get<number>("layr.deprecationsDeferred") === n.count) return;
    const what = n.titles.join("; ");
    const pick = await window.showWarningMessage(
      `LAYR${n.since ? ` ${n.since}` : ""}: ${what}. ${n.count} place(s) in ${n.files} file(s) use the old form, which still works until the next major version.`,
      "Update all",
      "Review",
      "Not now",
    );
    if (pick === "Update all") await commands.executeCommand("layr.upgradeAll");
    else if (pick === "Review") await commands.executeCommand("workbench.actions.view.problems");
    else if (pick === "Not now") await ctx.workspaceState.update("layr.deprecationsDeferred", n.count);
  });
  return client;
}

async function startProject(root: string, folder: WorkspaceFolder | undefined) {
  const install = useProjectServer() ? resolveProjectLayr(root) : null;
  const name = `LAYR ${install ? install.version : `${bundledVersion()} (bundled)`}${projects.size ? ` · ${path.basename(root)}` : ""}`;
  const client = await startClient(name, serverFor(install), {
    documentSelector: [{ scheme: "file", language: "layr", pattern: new RelativePattern(Uri.file(root), "**/*") }],
    workspaceFolder: { uri: Uri.file(root), name: folder?.name ?? path.basename(root), index: folder?.index ?? 0 },
    synchronize: { fileEvents: [workspace.createFileSystemWatcher(new RelativePattern(Uri.file(root), "**/*.layr")), workspace.createFileSystemWatcher(new RelativePattern(Uri.file(root), "**/layr.yaml"))] },
  });
  // A different version installed (npm install, layr upgrade): restart on it. Polled, because
  // editors do not watch node_modules.
  const watching = path.join(root, "node_modules", "@dynshift", "layr", "package.json");
  watchFile(watching, { interval: 2000 }, () => void restartProject(root));
  projects.set(root, { root, install, client, watching });
  updateStatus();
}

async function stopProject(root: string) {
  const p = projects.get(root);
  if (!p) return;
  projects.delete(root);
  unwatchFile(p.watching);
  await p.client.stop();
}

async function restartProject(root: string) {
  const before = projects.get(root)?.install?.version ?? null;
  const now = useProjectServer() ? (resolveProjectLayr(root)?.version ?? null) : null;
  if (projects.has(root) && before === now) return;
  const folder = workspace.getWorkspaceFolder(Uri.file(root));
  await stopProject(root);
  await startProject(root, folder);
  if (before !== now) window.showInformationMessage(now ? `LAYR ${now}: the editor now checks this project with its installed version.` : `LAYR: no @dynshift/layr installed in ${path.basename(root)}; using the extension's ${bundledVersion()}.`);
}

/** Every LAYR project in the workspace: folders with a `layr.yaml`, outside node_modules. */
async function findProjects(): Promise<Array<{ root: string; folder: WorkspaceFolder | undefined }>> {
  const files = await workspace.findFiles("**/layr.yaml", "**/node_modules/**", 50);
  return files.map((f) => path.dirname(f.fsPath)).filter((r, i, all) => all.indexOf(r) === i).map((root) => ({ root, folder: workspace.getWorkspaceFolder(Uri.file(root)) }));
}

async function sync() {
  const found = await findProjects();
  const roots = new Set(found.map((f) => f.root));
  for (const root of [...projects.keys()]) if (!roots.has(root)) await stopProject(root);
  for (const { root, folder } of found) if (!projects.has(root)) await startProject(root, folder);
  // `.layr` files with no project around them get the bundled server.
  if (!projects.size && !loose) {
    loose = await startClient(`LAYR ${bundledVersion()} (bundled)`, serverFor(null), { documentSelector: [{ scheme: "file", language: "layr" }] });
  } else if (projects.size && loose) {
    await loose.stop();
    loose = undefined;
  }
  updateStatus();
}

/** The project the active editor's file belongs to (the deepest one). */
function activeProject(): Project | undefined {
  const file = window.activeTextEditor?.document.uri.fsPath;
  if (!file) return projects.size === 1 ? [...projects.values()][0] : undefined;
  return [...projects.values()].filter((p) => file.startsWith(p.root + path.sep)).sort((a, b) => b.root.length - a.root.length)[0];
}

function updateStatus() {
  const p = activeProject();
  const doc = window.activeTextEditor?.document;
  if (!p && !(doc?.languageId === "layr")) {
    status.hide();
    return;
  }
  if (p?.install) {
    status.text = `LAYR ${p.install.version}`;
    status.tooltip = `This project's @dynshift/layr ${p.install.version} checks, completes and formats ${path.basename(p.root)}. Click to restart it.`;
  } else {
    status.text = `LAYR ${bundledVersion()} (bundled)`;
    status.tooltip = p ? `No @dynshift/layr is installed in ${path.basename(p.root)} yet (or "layr.server" is "bundled"), so the extension's own ${bundledVersion()} checks it. Click to restart.` : `Not in a LAYR project: the extension's own ${bundledVersion()} checks this file.`;
  }
  status.show();
}

export async function activate(context: ExtensionContext) {
  ctx = context;
  status = window.createStatusBarItem(StatusBarAlignment.Right, 100);
  status.command = "layr.restart";
  context.subscriptions.push(
    status,
    window.onDidChangeActiveTextEditor(updateStatus),
    workspace.onDidChangeWorkspaceFolders(() => void sync()),
    workspace.onDidCreateFiles((e) => {
      if (e.files.some((f) => f.fsPath.endsWith("layr.yaml"))) void sync();
    }),
    workspace.onDidDeleteFiles((e) => {
      if (e.files.some((f) => f.fsPath.endsWith("layr.yaml"))) void sync();
    }),
    workspace.onDidChangeConfiguration(async (e) => {
      if (!e.affectsConfiguration("layr.server")) return;
      for (const root of [...projects.keys()]) await stopProject(root);
      await sync();
    }),
    commands.registerCommand("layr.restart", async () => {
      for (const root of [...projects.keys()]) await stopProject(root);
      if (loose) await loose.stop();
      loose = undefined;
      await sync();
      window.showInformationMessage(`LAYR language server restarted${activeProject()?.install ? ` (${activeProject()?.install?.version})` : ""}.`);
    }),
    commands.registerCommand("layr.explain", async () => {
      const code = await window.showInputBox({ prompt: "Diagnostic code, e.g. L3102" });
      if (code) await env.openExternal(Uri.parse(`https://layr.dynshift.com/errors/${code.trim().toUpperCase()}`));
    }),
  );
  await sync();
}

export async function deactivate() {
  for (const root of [...projects.keys()]) await stopProject(root);
  await loose?.stop();
}
