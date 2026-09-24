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
