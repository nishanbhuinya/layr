import * as path from "node:path";
import { commands, type ExtensionContext, env, Uri, window, workspace } from "vscode";
import { LanguageClient, type LanguageClientOptions, type ServerOptions, TransportKind } from "vscode-languageclient/node";

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext) {
  const server = context.asAbsolutePath(path.join("dist", "server.js"));
  const serverOptions: ServerOptions = {
    run: { module: server, transport: TransportKind.stdio },
    debug: { module: server, transport: TransportKind.stdio },
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "layr" }],
    synchronize: { fileEvents: [workspace.createFileSystemWatcher("**/*.layr"), workspace.createFileSystemWatcher("**/layr.yaml")] },
  };
  client = new LanguageClient("layr", "LAYR", serverOptions, clientOptions);
  await client.start();

  // Deprecated forms: say what changed and where, and update only when the developer says so.
  // "Not now" holds until the number of places changes.
  client.onNotification("layr/deprecations", async (n: { count: number; files: number; titles: string[]; since: string | null }) => {
    if (!n.count || context.workspaceState.get<number>("layr.deprecationsDeferred") === n.count) return;
    const what = n.titles.join("; ");
    const pick = await window.showWarningMessage(
      `LAYR${n.since ? ` ${n.since}` : ""}: ${what}. ${n.count} place(s) in ${n.files} file(s) use the old form, which still works until the next major version.`,
      "Update all",
      "Review",
      "Not now",
    );
    if (pick === "Update all") await commands.executeCommand("layr.upgradeAll");
    else if (pick === "Review") await commands.executeCommand("workbench.actions.view.problems");
    else if (pick === "Not now") await context.workspaceState.update("layr.deprecationsDeferred", n.count);
  });

  context.subscriptions.push(
    commands.registerCommand("layr.restart", async () => {
      await client?.restart();
      window.showInformationMessage("LAYR language server restarted.");
    }),
    commands.registerCommand("layr.explain", async () => {
      const code = await window.showInputBox({ prompt: "Diagnostic code, e.g. L3102" });
      if (code) await env.openExternal(Uri.parse(`https://layr.dynshift.com/errors/${code.trim().toUpperCase()}`));
    }),
  );
}

export async function deactivate() {
  await client?.stop();
}
