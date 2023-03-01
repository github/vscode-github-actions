import * as vscode from "vscode";
import {SecretCommandArgs} from "../../treeViews/settings/secretNode";

export function registerDeleteSecret(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.settings.secret.delete", async (args: SecretCommandArgs) => {
      const gitHubContext = args.gitHubRepoContext;
      const secret = args.secret;
      const acceptText = "Yes, delete this secret";
      try {
        await vscode.window
          .showInformationMessage(
            `Are you sure you want to delete ${secret.name}?`,
            {modal: true, detail: "Deleting this secret cannot be undone and may impact workflows in this repository"},
            acceptText
          )
          .then(async answer => {
            if (answer === acceptText) {
              await gitHubContext.client.actions.deleteRepoSecret({
                owner: gitHubContext.owner,
                repo: gitHubContext.name,
                secret_name: secret.name
              });
            }
          });
      } catch (e) {
        await vscode.window.showErrorMessage((e as Error).message);
      }
      await vscode.commands.executeCommand("github-actions.explorer.refresh");
    })
  );
}
