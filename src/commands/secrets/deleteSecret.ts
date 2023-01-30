import * as vscode from "vscode";
import {SecretCommandArgs} from "../../treeViews/settings/secretNode";

export function registerDeleteSecret(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.settings.secret.delete", async (args: SecretCommandArgs) => {
      const gitHubContext = args.gitHubRepoContext;
      const secret = args.secret;

      await gitHubContext.client.actions.deleteRepoSecret({
        owner: gitHubContext.owner,
        repo: gitHubContext.name,
        secret_name: secret.name
      });

      await vscode.commands.executeCommand("github-actions.explorer.refresh");
    })
  );
}
