import * as vscode from "vscode";

import {getGitHubContext, resetGitHubContext} from "../git/repository";

export function initWorkspaceChangeTracker(context: vscode.ExtensionContext) {
  const onDidChangeWorkspaceFolders = async (event: vscode.WorkspaceFoldersChangeEvent) => {
    if (event.added.length > 0 || event.removed.length > 0) {
      resetGitHubContext();
      const context = await getGitHubContext();
      const hasGitHubRepos = context && context.repos.length > 0;
      await vscode.commands.executeCommand("setContext", "github-actions.has-repos", hasGitHubRepos);
    }
  };
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(onDidChangeWorkspaceFolders));
}
