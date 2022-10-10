import * as vscode from "vscode";

import { GitHubRepoContext } from "../git/repository";
import { Workflow } from "../model";
import { getWorkflowUri } from "../workflow/workflow";
import { unpinWorkflow } from "../configuration/configuration";

interface UnPinWorkflowCommandOptions {
  gitHubRepoContext: GitHubRepoContext;
  wf?: Workflow;

  updateContextValue(): void;
}

export function registerUnPinWorkflow(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.workflow.unpin", async (args: UnPinWorkflowCommandOptions) => {
      const { gitHubRepoContext, wf } = args;

      if (!wf) {
        return;
      }

      const workflowFullPath = getWorkflowUri(gitHubRepoContext, wf.path);
      if (!workflowFullPath) {
        return;
      }

      const relativeWorkflowPath = vscode.workspace.asRelativePath(workflowFullPath);
      await unpinWorkflow(relativeWorkflowPath);

      args.updateContextValue();
      vscode.commands.executeCommand("github-actions.explorer.refresh");
    }),
  );
}
