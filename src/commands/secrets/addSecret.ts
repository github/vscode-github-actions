import * as vscode from "vscode";
import {encodeSecret} from "../../secrets";
import {EnvironmentSecretsCommandArgs} from "../../treeViews/settings/environmentSecretsNode";
import {RepoSecretsCommandArgs} from "../../treeViews/settings/repoSecretsNode";
import {GitHubRepoContext} from "../../git/repository";

type AddSecretCommandArgs = RepoSecretsCommandArgs | EnvironmentSecretsCommandArgs;

export function registerAddSecret(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.settings.secret.add", async (args: AddSecretCommandArgs) => {
      const {gitHubRepoContext} = args;

      const name = await vscode.window.showInputBox({
        prompt: "Enter name for new secret"
      });

      if (!name) {
        return;
      }

      const value = await vscode.window.showInputBox({
        prompt: "Enter the new secret value"
      });

      if (!value) {
        return;
      }

      try {
        if ("environment" in args) {
          await createOrUpdateEnvSecret(gitHubRepoContext, args.environment.name, name, value);
        } else {
          await createOrUpdateRepoSecret(gitHubRepoContext, name, value);
        }
      } catch (e) {
        await vscode.window.showErrorMessage((e as Error).message);
      }

      await vscode.commands.executeCommand("github-actions.explorer.refresh");
    })
  );
}

export async function createOrUpdateRepoSecret(context: GitHubRepoContext, name: string, value: string) {
  const keyResponse = await context.client.actions.getRepoPublicKey({
    owner: context.owner,
    repo: context.name
  });

  await context.client.actions.createOrUpdateRepoSecret({
    owner: context.owner,
    repo: context.name,
    secret_name: name,
    key_id: keyResponse.data.key_id,
    encrypted_value: await encodeSecret(keyResponse.data.key, value)
  });
}

export async function createOrUpdateEnvSecret(
  context: GitHubRepoContext,
  environment: string,
  name: string,
  value: string
) {
  const keyResponse = await context.client.actions.getEnvironmentPublicKey({
    repository_id: context.id,
    environment_name: environment
  });

  await context.client.actions.createOrUpdateEnvironmentSecret({
    repository_id: context.id,
    environment_name: environment,
    secret_name: name,
    key_id: keyResponse.data.key_id,
    encrypted_value: await encodeSecret(keyResponse.data.key, value)
  });
}
