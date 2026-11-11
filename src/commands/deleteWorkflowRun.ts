import * as vscode from "vscode";
import {WorkflowRunCommandArgs} from "../treeViews/shared/workflowRunNode";
import {executeDeleteWorkflowRun} from "./deleteWorkflowRunHandler";

export function registerDeleteWorkflowRun(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.workflow.run.delete", async (args: WorkflowRunCommandArgs) => {
      await executeDeleteWorkflowRun(args, {
        confirmDelete: (message, options, acceptText) =>
          vscode.window.showInformationMessage(message, options, acceptText),
        executeCommand: command => vscode.commands.executeCommand(command),
        showErrorMessage: message => vscode.window.showErrorMessage(message)
      });
    })
  );
}
