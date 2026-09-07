import * as vscode from "vscode";
import {WorkflowRunCommandArgs} from "../treeViews/shared/workflowRunNode";

export function registerDeleteWorkflowRun(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.workflow.run.delete", async (args: WorkflowRunCommandArgs) => {
      const {gitHubRepoContext, run} = args;
      const acceptText = "Yes, delete this workflow run";
      const answer = await vscode.window.showWarningMessage(
        `Are you sure you want to delete workflow run #${run.run.run_number}?`,
        {
          modal: true,
          detail: "Deleting this workflow run, its logs, and its artifacts cannot be undone"
        },
        acceptText
      );

      if (answer !== acceptText) {
        return;
      }

      try {
        await gitHubRepoContext.client.actions.deleteWorkflowRun({
          owner: gitHubRepoContext.owner,
          repo: gitHubRepoContext.name,
          run_id: run.run.id
        });
      } catch (e) {
        await vscode.window.showErrorMessage(`Could not delete workflow run: '${(e as Error).message}'`);
        return;
      }

      await Promise.all([
        vscode.commands.executeCommand("github-actions.explorer.refresh"),
        vscode.commands.executeCommand("github-actions.explorer.current-branch.refresh")
      ]);
    })
  );
}
