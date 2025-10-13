
import * as vscode from "vscode";
import {SecretCommandArgs} from "../../treeViews/settings/secretNode";
import {VariableCommandArgs} from "../../treeViews/settings/variableNode";

type DeleteCommandArgs = SecretCommandArgs | VariableCommandArgs;
type SettingType = "secret" | "variable";

export function registerDeleteSetting(context: vscode.ExtensionContext, type: SettingType) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `github-actions.settings.${type}.delete`,
      async (args: DeleteCommandArgs) => {
        const {gitHubRepoContext, environment} = args;

        let name: string;
        if (type === "secret") {
          name = (args as SecretCommandArgs).secret.name;
        } else {
          name = (args as VariableCommandArgs).variable.name;
        }

        const acceptText = `Yes, delete this ${type}`;
        try {
          await vscode.window
            .showInformationMessage(
              `Are you sure you want to delete ${name}?`,
              {
                modal: true,
                detail: `Deleting this ${type} cannot be undone and may impact workflows in this repository`
              },
              acceptText
            )
            .then(async answer => {
              if (answer === acceptText) {
                if (type === "secret") {
                  if (environment) {
                    await gitHubRepoContext.client.actions.deleteEnvironmentSecret({
                      owner: gitHubRepoContext.owner,
                      repo: gitHubRepoContext.name,
                      environment_name: environment.name,
                      secret_name: name
                    });
                  } else {
                    await gitHubRepoContext.client.actions.deleteRepoSecret({
                      owner: gitHubRepoContext.owner,
                      repo: gitHubRepoContext.name,
                      secret_name: name
                    });
                  }
                } else {
                  if (environment) {
                    await gitHubRepoContext.client.request(
                      `DELETE /repositories/${gitHubRepoContext.id}/environments/${environment.name}/variables/${name}`
                    );
                  } else {
                    await gitHubRepoContext.client.actions.deleteRepoVariable({
                      owner: gitHubRepoContext.owner,
                      repo: gitHubRepoContext.name,
                      name: name
                    });
                  }
                }
              }
            });
        } catch (e) {
          await vscode.window.showErrorMessage((e as Error).message);
        }
        await vscode.commands.executeCommand("github-actions.explorer.refresh");
      }
    )
  );
}
