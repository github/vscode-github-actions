import * as path from "path";
import * as vscode from "vscode";

import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient/node";
import { WorkflowSelector } from "./documentSelector";

let client: LanguageClient;

export function initLanguageServer(context: vscode.ExtensionContext) {
  // TODO: cschleid: figure out how this can work with workspaces
  const serverModule = context.asAbsolutePath(path.join("dist", "server-node.js"));

  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [WorkflowSelector],
    synchronize: {
      // // Notify the server about file changes to '.clientrc files contained in the workspace
      // fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient("actions-language", "Actions Language Server", serverOptions, clientOptions);

  client.start();
}

export function deactivateLanguageServer(): Promise<void> {
  if (!client) {
    return Promise.resolve();
  }

  return client.stop();
}
