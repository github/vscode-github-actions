import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {Environment} from "../../model";
import {EmptyNode} from "./emptyNode";
import {SecretNode} from "./secretNode";

export type EnvironmentSecretsCommandArgs = Pick<EnvironmentSecretsNode, "gitHubRepoContext" | "environment">;

export class EnvironmentSecretsNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly environment: Environment
  ) {
    super("Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon("lock");

    this.contextValue = "environment-secrets";
  }

  async getSecrets(): Promise<(SecretNode | EmptyNode)[]> {
    let secrets: SecretNode[] = [];
    try {
      secrets = await this.gitHubRepoContext.client.paginate(
        // @ts-expect-error FIXME: Newer Typescript catches a problem that previous didn't. This will be fixed in Octokit bump.
        this.gitHubRepoContext.client.actions.listEnvironmentSecrets,
        {
          repository_id: this.gitHubRepoContext.id,
          environment_name: this.environment.name,
          per_page: 100
        },
        // @ts-expect-error FIXME: Newer Typescript catches a problem that previous didn't. This will be fixed in Octokit bump.
        response => response.data.map(s => new SecretNode(this.gitHubRepoContext, s, this.environment))
      );
    } catch (e) {
      await vscode.window.showErrorMessage((e as Error).message);
    }

    if (!secrets || secrets.length === 0) {
      return [new EmptyNode("No environment secrets defined")];
    }

    return secrets;
  }
}
