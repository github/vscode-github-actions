import * as vscode from "vscode";

import {GitHubRepoContext} from "../git/repository";
import {Workflow} from "../model";
import {getWorkflowUri} from "../workflow/workflow";

interface OpenWorkflowCommandArgs {
  gitHubRepoContext: GitHubRepoContext;
  wf: Workflow;
}

export function registerOpenWorkflowFile(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.explorer.openWorkflowFile",
      async (args: OpenWorkflowCommandArgs) => {
        const {wf, gitHubRepoContext} = args;

        const fileUri = getWorkflowUri(gitHubRepoContext, wf.path);
        if (fileUri) {
          try {
            const textDocument = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(textDocument);
            return;
          } catch (e) {
            // Ignore error and show error message below
          }
        }

        // File not found in workspace
        await vscode.window.showErrorMessage(`Workflow ${wf.path} not found in current workspace`);
      }
    )
  );
}
