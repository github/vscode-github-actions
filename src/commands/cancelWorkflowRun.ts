import * as vscode from "vscode";
import {WorkflowRunCommandArgs} from "../treeViews/shared/workflowRunNode";

export function registerCancelWorkflowRun(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.workflow.run.cancel", async (args: WorkflowRunCommandArgs) => {
      const gitHubContext = args.gitHubRepoContext;
      const run = args.run;

      try {
        await gitHubContext.client.actions.cancelWorkflowRun({
          owner: gitHubContext.owner,
          repo: gitHubContext.name,
          run_id: run.run.id
        });
      } catch (e) {
        await vscode.window.showErrorMessage(`Could not cancel workflow: '${(e as Error).message}'`);
      }

      await vscode.commands.executeCommand("github-actions.explorer.refresh");
    })
  );
}
