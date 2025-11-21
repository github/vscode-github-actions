import * as vscode from "vscode";

import {canReachGitHubAPI} from "../api/canReachGitHubAPI";
import {executeCacheClearCommand} from "../workflow/languageServer";
import {getGitHubContext} from "../git/repository";
import {logDebug} from "../log";
import {RunStore} from "../store/store";
import {CombinedWorkflowsTreeProvider} from "./combinedWorkflows";
import {CurrentBranchTreeProvider} from "./currentBranch";
import {SettingsTreeProvider} from "./settings";
import {WorkflowsTreeProvider} from "./workflows";

export async function initTreeViews(context: vscode.ExtensionContext, store: RunStore): Promise<void> {
  const workflowTreeProvider = new WorkflowsTreeProvider(store);
  context.subscriptions.push(vscode.window.registerTreeDataProvider("github-actions.workflows", workflowTreeProvider));

  const combinedWorkflowsTreeProvider = new CombinedWorkflowsTreeProvider(store);
  const combinedWorkflowsTreeView = vscode.window.createTreeView("github-actions.combined-workflows", {
    treeDataProvider: combinedWorkflowsTreeProvider,
    showCollapseAll: true
  });
  combinedWorkflowsTreeProvider.setTreeView(combinedWorkflowsTreeView);
  context.subscriptions.push(combinedWorkflowsTreeView);
  context.subscriptions.push(combinedWorkflowsTreeProvider);

  combinedWorkflowsTreeView.onDidChangeVisibility(e => {
    combinedWorkflowsTreeProvider.setVisible(e.visible);
  });

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

      const ghContext = await getGitHubContext();
      const hasGitHubRepos = ghContext && ghContext.repos.length > 0;
      await vscode.commands.executeCommand("setContext", "github-actions.has-repos", hasGitHubRepos);

      if (canReachAPI && hasGitHubRepos) {
        await workflowTreeProvider.refresh();
        await combinedWorkflowsTreeProvider.refresh();
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

  const toggleAutoRefresh = () => {
    combinedWorkflowsTreeProvider.getAutoRefreshManager().toggleAutoRefresh();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.combined-workflows.toggle-auto-refresh", toggleAutoRefresh)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.combined-workflows.toggle-auto-refresh-on", toggleAutoRefresh)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.combined-workflows.toggle-auto-refresh-off", toggleAutoRefresh)
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

    let currentHeadName = repo.repositoryState.HEAD?.name;
    logDebug(`Initial state for ${repo.owner}/${repo.name}: branch=${currentHeadName}`);

    repo.repositoryState.onDidChange(async () => {
      const newHeadName = repo.repositoryState?.HEAD?.name;

      if (newHeadName !== currentHeadName) {
        logDebug(`Branch changed for ${repo.owner}/${repo.name}: ${currentHeadName} -> ${newHeadName}`);
        currentHeadName = newHeadName;
        await currentBranchTreeProvider.refresh();
      }
    });

    const pushWatcherPattern = new vscode.RelativePattern(repo.workspaceUri, ".git/refs/remotes/**");
    const pushWatcher = vscode.workspace.createFileSystemWatcher(pushWatcherPattern);

    pushWatcher.onDidChange(async (uri: vscode.Uri) => {
      logDebug(`Git push detected via ref change for ${repo.owner}/${repo.name} at ${uri.path}`);
      await currentBranchTreeProvider.refresh();
      combinedWorkflowsTreeProvider.onPush();
    });

    pushWatcher.onDidCreate(async (uri: vscode.Uri) => {
      logDebug(`Git push detected via ref creation for ${repo.owner}/${repo.name} at ${uri.path}`);
      await currentBranchTreeProvider.refresh();
      combinedWorkflowsTreeProvider.onPush();
    });

    context.subscriptions.push(pushWatcher);
  }
}
