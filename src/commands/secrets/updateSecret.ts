import * as vscode from "vscode";
import { GitHubRepoContext } from "../../git/repository";
import { RepoSecret } from "../../model";
import { encodeSecret } from "../../secrets";

interface UpdateSecretCommandArgs {
  gitHubRepoContext: GitHubRepoContext;
  secret: RepoSecret;
}

export function registerUpdateSecret(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.settings.secret.update",
      async (args: UpdateSecretCommandArgs) => {
        const gitHubContext = args.gitHubRepoContext;
        const secret: RepoSecret = args.secret;

        const value = await vscode.window.showInputBox({
          prompt: "Enter the new secret value",
        });

        if (!value) {
          return;
        }

        try {
          const keyResponse =
            await gitHubContext.client.actions.getRepoPublicKey({
              owner: gitHubContext.owner,
              repo: gitHubContext.name,
            });

          const key_id = keyResponse.data.key_id;
          const key = keyResponse.data.key;

          await gitHubContext.client.actions.createOrUpdateRepoSecret({
            owner: gitHubContext.owner,
            repo: gitHubContext.name,
            secret_name: secret.name,
            key_id: key_id,
            encrypted_value: encodeSecret(key, value),
          });
        } catch (e) {
          vscode.window.showErrorMessage(e.message);
        }
      }
    )
  );
}
