import * as vscode from "vscode";

import {getGitHubContext, resetGitHubContext} from "../git/repository";

export function initWorkspaceChangeTracker(context: vscode.ExtensionContext) {
  const onDidChangeWorkspaceFolders = async (event: vscode.WorkspaceFoldersChangeEvent) => {
    if (event.added.length > 0 || event.removed.length > 0) {
      resetGitHubContext();
      await getGitHubContext();
    }
  };
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(onDidChangeWorkspaceFolders));
}
