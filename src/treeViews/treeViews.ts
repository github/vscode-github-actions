import * as vscode from "vscode";
import {executeCacheClearCommand} from "../workflow/languageServer";
import {getGitHubContext} from "../git/repository";
import {logDebug} from "../log";
import {RunStore} from "../store/store";
import {canReachGitHubAPI} from "../util";
import {CurrentBranchTreeProvider} from "./currentBranch";
import {SettingsTreeProvider} from "./settings";
import {WorkflowsTreeProvider} from "./workflows";

export async function initTreeViews(context: vscode.ExtensionContext, store: RunStore): Promise<void> {
  const workflowTreeProvider = new WorkflowsTreeProvider(store);
  context.subscriptions.push(vscode.window.registerTreeDataProvider("github-actions.workflows", workflowTreeProvider));

  const settingsTreeProvider = new SettingsTreeProvider();
  context.subscriptions.push(vscode.window.registerTreeDataProvider("github-actions.settings", settingsTreeProvider));

  const currentBranchTreeProvider = new CurrentBranchTreeProvider(store);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("github-actions.current-branch", currentBranchTreeProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.explorer.refresh", async () => {
      const canReachAPI = await canReachGitHubAPI();
      await vscode.commands.executeCommand("setContext", "github-actions.internet-access", canReachAPI);
      if (canReachAPI) {
        await workflowTreeProvider.refresh();
        await settingsTreeProvider.refresh();
      }
      await executeCacheClearCommand();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.explorer.current-branch.refresh", async () => {
      await currentBranchTreeProvider.refresh();
    })
  );

  const gitHubContext = await getGitHubContext();
  if (!gitHubContext) {
    logDebug("Could not register branch change event handler");
    return;
  }

  for (const repo of gitHubContext.repos) {
    if (!repo.repositoryState) {
      continue;
    }

    let currentAhead = repo.repositoryState.HEAD?.ahead;
    let currentHeadName = repo.repositoryState.HEAD?.name;
    repo.repositoryState.onDidChange(async () => {
      // When the current head/branch changes, or the number of commits ahead changes (which indicates
      // a push), refresh the current-branch view
      if (
        repo.repositoryState?.HEAD?.name !== currentHeadName ||
        (repo.repositoryState?.HEAD?.ahead || 0) < (currentAhead || 0)
      ) {
        currentHeadName = repo.repositoryState?.HEAD?.name;
        currentAhead = repo.repositoryState?.HEAD?.ahead;
        await currentBranchTreeProvider.refresh();
      }
    });
  }
}
