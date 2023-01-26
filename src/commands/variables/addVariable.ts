import * as vscode from "vscode";
import {EnvironmentVariablesCommandArgs} from "../../treeViews/settings/environmentVariablesNode";
import {RepoVariablesCommandArgs} from "../../treeViews/settings/repoVariablesNode";

type Args = RepoVariablesCommandArgs | EnvironmentVariablesCommandArgs;

export function registerAddVariable(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.settings.variable.add", async (args: Args) => {
      const {gitHubRepoContext} = args;

      const name = await vscode.window.showInputBox({
        prompt: "Enter name for new variable",
        placeHolder: "Variable name"
      });

      if (!name) {
        return;
      }

      const value = await vscode.window.showInputBox({
        prompt: "Enter the new variable value"
      });

      if (!value) {
        return;
      }

      try {
        if ("environment" in args) {
          await gitHubRepoContext.client.actions.createEnvironmentVariable({
            repository_id: gitHubRepoContext.id,
            environment_name: args.environment.name,
            name,
            value
          });
        } else {
          await gitHubRepoContext.client.actions.createRepoVariable({
            owner: gitHubRepoContext.owner,
            repo: gitHubRepoContext.name,
            name,
            value
          });
        }
      } catch (e) {
        await vscode.window.showErrorMessage((e as Error).message);
      }

      await vscode.commands.executeCommand("github-actions.explorer.refresh");
    })
  );
}
