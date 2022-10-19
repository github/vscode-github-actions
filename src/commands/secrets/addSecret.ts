import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {encodeSecret} from "../../secrets";

interface AddSecretCommandArgs {
  gitHubRepoContext: GitHubRepoContext;
}

export function registerAddSecret(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.settings.secret.add", async (args: AddSecretCommandArgs) => {
      const gitHubContext = args.gitHubRepoContext;

      const name = await vscode.window.showInputBox({
        prompt: "Enter name for new secret"
      });

      if (!name) {
        return;
      }

      const value = await vscode.window.showInputBox({
        prompt: "Enter the new secret value"
      });

      if (value) {
        try {
          const keyResponse = await gitHubContext.client.actions.getRepoPublicKey({
            owner: gitHubContext.owner,
            repo: gitHubContext.name
          });

          const key_id = keyResponse.data.key_id;
          const key = keyResponse.data.key;

          await gitHubContext.client.actions.createOrUpdateRepoSecret({
            owner: gitHubContext.owner,
            repo: gitHubContext.name,
            secret_name: name,
            key_id: key_id,
            encrypted_value: encodeSecret(key, value)
          });
        } catch (e) {
          await vscode.window.showErrorMessage((e as Error).message);
        }
      }

      await vscode.commands.executeCommand("github-actions.explorer.refresh");
    })
  );
}
