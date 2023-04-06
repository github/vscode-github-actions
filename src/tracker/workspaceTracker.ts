import * as vscode from "vscode";

import {resetGitHubContext} from "../git/repository";
import {setViewContexts} from "../viewContexts";

export function initWorkspaceChangeTracker(context: vscode.ExtensionContext) {
  const onDidChangeWorkspaceFolders = async (event: vscode.WorkspaceFoldersChangeEvent) => {
    if (event.added.length > 0 || event.removed.length > 0) {
      resetGitHubContext();

      await setViewContexts();
    }
  };
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(onDidChangeWorkspaceFolders));
}
