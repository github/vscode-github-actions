import * as vscode from 'vscode';

import {GitHubRepoContext} from '../git/repository';
import {Workflow} from '../model';
import {getWorkflowUri} from '../workflow/workflow';
import {pinWorkflow} from '../configuration/configuration';

interface PinWorkflowCommandOptions {
  gitHubRepoContext: GitHubRepoContext;
  wf?: Workflow;

  updateContextValue(): void;
}

export function registerPinWorkflow(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('github-actions.workflow.pin', async (args: PinWorkflowCommandOptions) => {
      const {gitHubRepoContext, wf} = args;

      if (!wf) {
        return;
      }

      const workflowFullPath = getWorkflowUri(gitHubRepoContext, wf.path);
      if (!workflowFullPath) {
        return;
      }

      const relativeWorkflowPath = vscode.workspace.asRelativePath(workflowFullPath);
      await pinWorkflow(relativeWorkflowPath);

      args.updateContextValue();
      vscode.commands.executeCommand('github-actions.explorer.refresh');
    })
  );
}
