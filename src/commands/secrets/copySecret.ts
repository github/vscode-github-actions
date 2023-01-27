import * as vscode from "vscode";
import {SecretCommandArgs} from "../../treeViews/settings/secretNode";

export function registerCopySecret(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.settings.secret.copy", async (args: SecretCommandArgs) => {
      const {secret} = args;

      await vscode.env.clipboard.writeText(secret.name);

      vscode.window.setStatusBarMessage(`Copied ${secret.name}`, 2000);
    })
  );
}
