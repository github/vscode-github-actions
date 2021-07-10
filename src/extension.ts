import * as vscode from "vscode";
import { registerCancelWorkflowRun } from "./commands/cancelWorkflowRun";
import { registerOpenWorkflowFile } from "./commands/openWorkflowFile";
import { registerOpenWorkflowRun } from "./commands/openWorkflowRun";
import { registerOpenWorkflowRunLogs } from "./commands/openWorkflowRunLogs";
import { registerOrgLogin } from "./commands/orgLogin";
import { registerReRunWorkflowRun } from "./commands/rerunWorkflowRun";
import { registerAddSecret } from "./commands/secrets/addSecret";
import { registerCopySecret } from "./commands/secrets/copySecret";
import { registerDeleteSecret } from "./commands/secrets/deleteSecret";
import { registerManageOrgSecrets } from "./commands/secrets/manageOrgSecrets";
import { registerUpdateSecret } from "./commands/secrets/updateSecret";
import { registerTriggerWorkflowRun } from "./commands/triggerWorkflowRun";
import { getGitHubContext } from "./git/repository";
import { LogScheme } from "./logs/constants";
import { WorkflowStepLogProvider } from "./logs/fileProvider";
import { WorkflowStepLogFoldingProvider } from "./logs/foldingProvider";
import { WorkflowStepLogSymbolProvider } from "./logs/symbolProvider";
import { initWorkflowDocumentTracking } from "./tracker/workflowDocumentTracker";
import { initResources } from "./treeViews/icons";
import { SettingsTreeProvider } from "./treeViews/settings";
import { WorkflowsTreeProvider } from "./treeViews/workflows";

export function activate(context: vscode.ExtensionContext) {
  // Prefetch git repository origin url
  getGitHubContext();

  initResources(context);

  // initConfiguration(context);
  // initPinnedWorkflows(context);

  // Track workflow
  initWorkflowDocumentTracking(context);

  //
  // Tree views
  //

  const workflowTreeProvider = new WorkflowsTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "github-actions.workflows",
      workflowTreeProvider
    )
  );

  const settingsTreeProvider = new SettingsTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "github-actions.settings",
      settingsTreeProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.explorer.refresh", () => {
      workflowTreeProvider.refresh();
      settingsTreeProvider.refresh();
    })
  );

  //
  // Commands
  //

  registerOpenWorkflowRun(context);
  registerOpenWorkflowFile(context);
  registerOpenWorkflowRunLogs(context);
  registerTriggerWorkflowRun(context);
  registerReRunWorkflowRun(context);
  registerCancelWorkflowRun(context);

  registerManageOrgSecrets(context);
  registerAddSecret(context);
  registerDeleteSecret(context);
  registerCopySecret(context);
  registerUpdateSecret(context);

  registerOrgLogin(context);

  //
  // Log providers
  //
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      LogScheme,
      new WorkflowStepLogProvider()
    )
  );

  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider(
      { scheme: LogScheme },
      new WorkflowStepLogFoldingProvider()
    )
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      {
        scheme: LogScheme,
      },
      new WorkflowStepLogSymbolProvider()
    )
  );

  /*
  //
  // Editing features
  //
  init(context);
  */
}
