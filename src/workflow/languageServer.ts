import * as path from "path";
import * as vscode from "vscode";

import {LanguageClient, LanguageClientOptions, ServerOptions, TransportKind} from "vscode-languageclient/node";
import {InitializationOptions} from "@github/actions-languageserver/initializationOptions";
import {getSession} from "../auth/auth";
import {WorkflowSelector} from "./documentSelector";
import {getGitHubContext} from "../git/repository";

let client: LanguageClient;

export async function initLanguageServer(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join("dist", "server-node.js"));

  const debugOptions = {execArgv: ["--nolazy", "--inspect=6010"]};

  const serverOptions: ServerOptions = {
    run: {module: serverModule, transport: TransportKind.ipc},
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  const session = await getSession();

  const ghContext = await getGitHubContext();
  const initializationOptions: InitializationOptions = {
    sessionToken: session.accessToken,
    repos: ghContext?.repos.map(repo => ({
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      workspaceUri: repo.workspaceUri.toString()
    }))
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [WorkflowSelector],
    synchronize: {
      // // Notify the server about file changes to '.clientrc files contained in the workspace
      // fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
    initializationOptions: initializationOptions
  };

  // Create the language client and start the client.
  client = new LanguageClient("actions-language", "GitHub Actions Language Server", serverOptions, clientOptions);

  await client.start();
}

export function deactivateLanguageServer(): Promise<void> {
  if (!client) {
    return Promise.resolve();
  }

  return client.stop();
}
