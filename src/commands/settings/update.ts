
import * as vscode from "vscode";
import {SecretCommandArgs} from "../../treeViews/settings/secretNode";
import {VariableCommandArgs} from "../../treeViews/settings/variableNode";
import {createOrUpdateEnvSecret, createOrUpdateRepoSecret} from "./add";

type UpdateCommandArgs = SecretCommandArgs | VariableCommandArgs;
type SettingType = "secret" | "variable";

export function registerUpdateSetting(context: vscode.ExtensionContext, type: SettingType) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `github-actions.settings.${type}.update`,
      async (args: UpdateCommandArgs) => {
        if (type === "secret") {
          await updateSecret(args as SecretCommandArgs);
        } else {
          await updateVariable(args as VariableCommandArgs);
        }
      }
    )
  );
}

async function updateSecret(args: SecretCommandArgs) {
  const {gitHubRepoContext, secret, environment} = args;

  const value = await vscode.window.showInputBox({
    prompt: "Enter the new secret value"
  });

  if (!value) {
    return;
  }

  try {
    if (environment) {
      await createOrUpdateEnvSecret(gitHubRepoContext, environment.name, secret.name, value);
    } else {
      await createOrUpdateRepoSecret(gitHubRepoContext, secret.name, value);
    }
  } catch (e) {
    await vscode.window.showErrorMessage((e as Error).message);
  }
}

async function updateVariable(args: VariableCommandArgs) {
  const {gitHubRepoContext, variable, environment} = args;

  const name = await vscode.window.showInputBox({
    prompt: "Enter the new variable name",
    value: variable.name
  });

  const value = await vscode.window.showInputBox({
    prompt: "Enter the new variable value",
    value: variable.value
  });

  if (name == variable.name && value == variable.value) {
    return;
  }

  const payload: {name?: string; value?: string} = {};
  if (name != variable.name) {
    payload.name = name;
  }
  if (value != variable.value) {
    payload.value = value;
  }

  try {
    if (environment) {
      await gitHubRepoContext.client.request(
        `PATCH /repositories/${gitHubRepoContext.id}/environments/${environment.name}/variables/${variable.name}`,
        payload
      );
    } else {
      await gitHubRepoContext.client.request(
        `PATCH /repos/${gitHubRepoContext.owner}/${gitHubRepoContext.name}/actions/variables/${variable.name}`,
        payload
      );
    }
  } catch (e) {
    await vscode.window.showErrorMessage((e as Error).message);
  }

  await vscode.commands.executeCommand("github-actions.explorer.refresh");
}
