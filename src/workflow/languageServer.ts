import * as path from "path";
import * as vscode from "vscode";

import {Commands} from "@actions/languageserver/commands";
import {InitializationOptions, LogLevel} from "@actions/languageserver/initializationOptions";
import {ReadFileRequest, Requests} from "@actions/languageserver/request";
import {BaseLanguageClient, LanguageClientOptions} from "vscode-languageclient";
import {LanguageClient as BrowserLanguageClient} from "vscode-languageclient/browser";
import {LanguageClient as NodeLanguageClient, ServerOptions, TransportKind} from "vscode-languageclient/node";
import {userAgent} from "../api/api";
import {getSession} from "../auth/auth";
import {getGitHubContext} from "../git/repository";
import {WorkflowSelector} from "./documentSelector";

let client: BaseLanguageClient;

/** Helper function determining whether we are executing with node runtime */
function isNode(): boolean {
  return typeof process !== "undefined" && process.versions?.node != null;
}

export async function initLanguageServer(context: vscode.ExtensionContext) {
  const session = await getSession();

  const ghContext = await getGitHubContext();
  const initializationOptions: InitializationOptions = {
    sessionToken: session?.accessToken,
    userAgent: userAgent,
    repos: ghContext?.repos.map(repo => ({
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      workspaceUri: repo.workspaceUri.toString(),
      organizationOwned: repo.organizationOwned
    })),
    logLevel: PRODUCTION ? LogLevel.Warn : LogLevel.Debug
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [WorkflowSelector],
    initializationOptions: initializationOptions,
    progressOnInitialization: true
  };

  // Create the language client and start the client.
  if (isNode()) {
    const debugOptions = {execArgv: ["--nolazy", "--inspect=6010"]};

    const serverModule = context.asAbsolutePath(path.join("dist", "server-node.js"));
    const serverOptions: ServerOptions = {
      run: {module: serverModule, transport: TransportKind.ipc},
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: debugOptions
      }
    };

    client = new NodeLanguageClient("actions-language", "GitHub Actions Language Server", serverOptions, clientOptions);
  } else {
    const serverModule = vscode.Uri.joinPath(context.extensionUri, "dist", "server-web.js");
    const worker = new Worker(serverModule.toString());
    client = new BrowserLanguageClient("actions-language", "GitHub Actions Language Server", clientOptions, worker);
  }

  client.onRequest(Requests.ReadFile, async (event: ReadFileRequest) => {
    if (typeof event?.path !== "string") {
      return null;
    }

    const uri = vscode.Uri.parse(event?.path);
    const content = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(content);
  });

  return client.start();
}

export function deactivateLanguageServer(): Promise<void> {
  if (!client) {
    return Promise.resolve();
  }

  return client.stop();
}

export function executeCacheClearCommand(): Promise<void> {
  if (!client) {
    return Promise.resolve();
  }

  return client.sendRequest("workspace/executeCommand", {command: Commands.ClearCache});
}
