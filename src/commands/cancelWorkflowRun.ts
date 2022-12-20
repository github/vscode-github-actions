import * as vscode from "vscode";
import {WorkflowRunCommandArgs} from "../treeViews/shared/workflowRunNode";

export function registerCancelWorkflowRun(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.workflow.run.cancel", async (args: WorkflowRunCommandArgs) => {
      const gitHubRepoContext = args.gitHubRepoContext;
      const run = args.run;

      try {
        await gitHubRepoContext.client.actions.cancelWorkflowRun({
          owner: gitHubRepoContext.owner,
          repo: gitHubRepoContext.name,
          run_id: run.run.id
        });
      } catch (e) {
        await vscode.window.showErrorMessage(`Could not cancel workflow: '${(e as Error).message}'`);
      }

      // Start refreshing the run to reflect cancellation in UI
      args.store.pollRun(run.run.id, gitHubRepoContext, 1000, 10);
    })
  );
}
