import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {WorkflowRun} from "../../model";

interface ManageOrgSecretsCommandArgs {
  gitHubRepoContext: GitHubRepoContext;
  run: WorkflowRun;
}

export function registerManageOrgSecrets(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.settings.secrets.manage",
      async (args: ManageOrgSecretsCommandArgs) => {
        const gitHubContext = args.gitHubRepoContext;

        // Open link to manage org-secrets
        await vscode.commands.executeCommand(
          "vscode.open",
          vscode.Uri.parse(`https://github.com/organizations/${gitHubContext.owner}/settings/secrets`)
        );
      }
    )
  );
}
