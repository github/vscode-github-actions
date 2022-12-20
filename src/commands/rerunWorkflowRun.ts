import * as vscode from "vscode";
import {WorkflowRunCommandArgs} from "../treeViews/shared/workflowRunNode";

export function registerReRunWorkflowRun(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.workflow.run.rerun", async (args: WorkflowRunCommandArgs) => {
      const gitHubContext = args.gitHubRepoContext;
      const run = args.run;

      try {
        await gitHubContext.client.actions.reRunWorkflow({
          owner: gitHubContext.owner,
          repo: gitHubContext.name,
          run_id: run.run.id
        });
      } catch (e) {
        await vscode.window.showErrorMessage(`Could not rerun workflow: '${(e as Error).message}'`);
      }

      await vscode.commands.executeCommand("github-actions.explorer.refresh");
    })
  );
}
