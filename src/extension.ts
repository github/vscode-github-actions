import * as vscode from "vscode";
import { ActionsExplorerProvider } from "./explorer/provider";
import { initResources } from "./explorer/icons";
import { Workflow } from "./model";
import { join } from "path";
import { setPAT } from "./auth/pat";

export function activate(context: vscode.ExtensionContext) {
  initResources(context);

  // Actions Explorer
  const explorerTreeProvider = new ActionsExplorerProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "actionsExplorer",
      explorerTreeProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("explorer.refresh", () => {
      explorerTreeProvider.refresh();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("explorer.openRun", args => {
      const url = args.url || args;
      vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("explorer.openWorkflowFile", async args => {
      const wf: Workflow = args.wf;

      for (const workspaceFolder of vscode.workspace.workspaceFolders || []) {
        const fileUri = vscode.Uri.file(
          join(workspaceFolder.uri.fsPath, wf.path)
        );
        if (vscode.workspace.getWorkspaceFolder(fileUri)) {
          const textDocument = await vscode.workspace.openTextDocument(fileUri);
          vscode.window.showTextDocument(textDocument);
          return;
        }
      }

      // File not found in workspace
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("auth.login", async () => {
      const selection = await vscode.window.showQuickPick([
        "Enter PAT",
        "Use OAuth flow (coming soon)"
      ]);

      switch (selection) {
        case "Enter PAT":
          const token = await vscode.window.showInputBox({
            prompt: "Enter a GitHub PAT with `workflow` and `repo` scope:"
          });
          if (token) {
            await setPAT(token);
          }
          break;
      }
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
