import * as vscode from "vscode";
import { Workflow } from "../model";
import { getWorkflowUri } from "../workflow/workflow";

export function registerOpenWorkflowFile(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.explorer.openWorkflowFile",
      async (args) => {
        const wf: Workflow = args.wf;

        const fileUri = getWorkflowUri(wf.path);
        if (fileUri) {
          const textDocument = await vscode.workspace.openTextDocument(fileUri);
          vscode.window.showTextDocument(textDocument);
          return;
        }

        // File not found in workspace
        vscode.window.showErrorMessage(
          `Workflow ${wf.path} not found in current workspace`
        );
      }
    )
  );
}
