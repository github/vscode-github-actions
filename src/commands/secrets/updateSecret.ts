import * as vscode from "vscode";
import {RepoSecret} from "../../model";
import {encodeSecret} from "../../secrets";
import {SecretCommandArgs} from "../../treeViews/settings/secretNode";

export function registerUpdateSecret(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.settings.secret.update", async (args: SecretCommandArgs) => {
      const gitHubContext = args.gitHubRepoContext;
      const secret: RepoSecret = args.secret;

      const value = await vscode.window.showInputBox({
        prompt: "Enter the new secret value"
      });

      if (!value) {
        return;
      }

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
          secret_name: secret.name,
          key_id: key_id,
          encrypted_value: await encodeSecret(key, value)
        });
      } catch (e) {
        await vscode.window.showErrorMessage((e as Error).message);
      }
    })
  );
}
