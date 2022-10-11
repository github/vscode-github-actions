import * as vscode from "vscode";

import { GitHubRepoContext } from "../git/repository";
import { WorkflowRun } from "../model";

interface ReRunWorkflowRunLogsCommandArgs {
  gitHubRepoContext: GitHubRepoContext;
  run: WorkflowRun;
}

export function registerReRunWorkflowRun(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.workflow.run.rerun",
      async (args: ReRunWorkflowRunLogsCommandArgs) => {
        const gitHubContext = args.gitHubRepoContext;
        const run = args.run;

        try {
          await gitHubContext.client.actions.reRunWorkflow({
            owner: gitHubContext.owner,
            repo: gitHubContext.name,
            run_id: run.id,
          });
        } catch (e: any) {
          vscode.window.showErrorMessage(
            `Could not rerun workflow: '${e.message}'`
          );
        }

        vscode.commands.executeCommand("github-actions.explorer.refresh");
      }
    )
  );
}
