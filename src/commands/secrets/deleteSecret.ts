import * as vscode from 'vscode';
import {GitHubRepoContext} from '../../git/repository';
import {RepoSecret} from '../../model';

interface DeleteSecretCommandArgs {
  gitHubRepoContext: GitHubRepoContext;
  secret: RepoSecret;
}

export function registerDeleteSecret(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('github-actions.settings.secret.delete', async (args: DeleteSecretCommandArgs) => {
      const gitHubContext = args.gitHubRepoContext;
      const secret = args.secret;

      await gitHubContext.client.actions.deleteRepoSecret({
        owner: gitHubContext.owner,
        repo: gitHubContext.name,
        secret_name: secret.name
      });

      vscode.commands.executeCommand('github-actions.explorer.refresh');
    })
  );
}
