import * as vscode from "vscode";

import { LogScheme } from "./logs/constants";
import { SettingsTreeProvider } from "./treeViews/settings";
import { WorkflowStepLogFoldingProvider } from "./logs/foldingProvider";
import { WorkflowStepLogProvider } from "./logs/fileProvider";
import { WorkflowStepLogSymbolProvider } from "./logs/symbolProvider";
import { WorkflowsTreeProvider } from "./treeViews/workflows";
import { getGitHubContext } from "./git/repository";
import { init } from "./workflow/diagnostics";
import { initConfiguration } from "./configuration/configuration";
import { initPinnedWorkflows } from "./pinnedWorkflows/pinnedWorkflows";
import { initResources } from "./treeViews/icons";
import { initWorkflowDocumentTracking } from "./tracker/workflowDocumentTracker";
import { registerAddSecret } from "./commands/secrets/addSecret";
import { registerCancelWorkflowRun } from "./commands/cancelWorkflowRun";
import { registerCopySecret } from "./commands/secrets/copySecret";
import { registerDeleteSecret } from "./commands/secrets/deleteSecret";
import { registerManageOrgSecrets } from "./commands/secrets/manageOrgSecrets";
import { registerOpenWorkflowFile } from "./commands/openWorkflowFile";
import { registerOpenWorkflowRun } from "./commands/openWorkflowRun";
import { registerOpenWorkflowRunLogs } from "./commands/openWorkflowRunLogs";
import { registerOrgLogin } from "./commands/orgLogin";
import { registerPinWorkflow } from "./commands/pinWorkflow";
import { registerReRunWorkflowRun } from "./commands/rerunWorkflowRun";
import { registerTriggerWorkflowRun } from "./commands/triggerWorkflowRun";
import { registerUnPinWorkflow } from "./commands/unpinWorkflow";
import { registerUpdateSecret } from "./commands/secrets/updateSecret";

export function activate(context: vscode.ExtensionContext) {
  // Prefetch git repository origin url
  getGitHubContext();

  initResources(context);

  initConfiguration(context);
  initPinnedWorkflows(context);

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

  registerPinWorkflow(context);
  registerUnPinWorkflow(context);

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

  //
  // Editing features
  //
  init(context);
}
