import * as vscode from "vscode";

import {init as initLogger, log, revealLog} from "./log";

import {registerCancelWorkflowRun} from "./commands/cancelWorkflowRun";
import {registerOpenWorkflowFile} from "./commands/openWorkflowFile";
import {registerOpenWorkflowJobLogs} from "./commands/openWorkflowJobLogs";
import {registerOpenWorkflowRun} from "./commands/openWorkflowRun";
import {registerPinWorkflow} from "./commands/pinWorkflow";
import {registerReRunWorkflowRun} from "./commands/rerunWorkflowRun";
import {registerAddSecret} from "./commands/secrets/addSecret";
import {registerCopySecret} from "./commands/secrets/copySecret";
import {registerDeleteSecret} from "./commands/secrets/deleteSecret";
import {registerUpdateSecret} from "./commands/secrets/updateSecret";
import {registerTriggerWorkflowRun} from "./commands/triggerWorkflowRun";
import {registerUnPinWorkflow} from "./commands/unpinWorkflow";
import {registerAddVariable} from "./commands/variables/addVariable";
import {initConfiguration} from "./configuration/configuration";
import {getGitHubContext} from "./git/repository";
import {LogScheme} from "./logs/constants";
import {WorkflowStepLogProvider} from "./logs/fileProvider";
import {WorkflowStepLogFoldingProvider} from "./logs/foldingProvider";
import {WorkflowStepLogSymbolProvider} from "./logs/symbolProvider";
import {initPinnedWorkflows} from "./pinnedWorkflows/pinnedWorkflows";
import {RunStore} from "./store/store";
import {initWorkflowDocumentTracking} from "./tracker/workflowDocumentTracker";
import {initResources} from "./treeViews/icons";
import {initTreeViews} from "./treeViews/treeViews";
import {deactivateLanguageServer, initLanguageServer} from "./workflow/languageServer";

export async function activate(context: vscode.ExtensionContext) {
  initLogger();

  log("Activating GitHub Actions extension...");

  // Prefetch git repository origin url
  await getGitHubContext();

  initResources(context);
  initConfiguration(context);

  // Track workflow documents
  await initWorkflowDocumentTracking(context);

  const store = new RunStore();

  // Pinned workflows
  await initPinnedWorkflows(store);

  // Tree views
  await initTreeViews(context, store);

  // Commands
  registerOpenWorkflowRun(context);
  registerOpenWorkflowFile(context);
  registerOpenWorkflowJobLogs(context);
  registerTriggerWorkflowRun(context);
  registerReRunWorkflowRun(context);
  registerCancelWorkflowRun(context);

  registerAddSecret(context);
  registerDeleteSecret(context);
  registerCopySecret(context);
  registerUpdateSecret(context);

  registerAddVariable(context);

  registerPinWorkflow(context);
  registerUnPinWorkflow(context);

  // Log providers
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(LogScheme, new WorkflowStepLogProvider())
  );

  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider({scheme: LogScheme}, new WorkflowStepLogFoldingProvider())
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      {
        scheme: LogScheme
      },
      new WorkflowStepLogSymbolProvider()
    )
  );

  // Editing features
  await initLanguageServer(context);

  log("...initialized");

  if (!PRODUCTION) {
    // In debugging mode, always open the log for the extension in the `Output` window
    revealLog();
  }
}

export function deactivate(): Thenable<void> | undefined {
  return deactivateLanguageServer();
}
