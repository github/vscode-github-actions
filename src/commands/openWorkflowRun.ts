import * as vscode from "vscode";
import {WorkflowRunCommandArgs} from "../treeViews/shared/workflowRunNode";

export function registerOpenWorkflowRun(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.workflow.run.open", async (args: WorkflowRunCommandArgs) => {
      const run = args.run;
      const url = run.run.html_url;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );
}
