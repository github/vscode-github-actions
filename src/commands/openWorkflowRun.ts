import * as vscode from "vscode";
import { WorkflowRun } from "../model";

export function registerOpenWorkflowRun(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.workflow.run.open", async (args) => {
      const run: WorkflowRun = args.run;
      const url = run.html_url;
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),
  );
}
