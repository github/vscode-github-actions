import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {EmptyNode} from "./emptyNode";
import {SecretNode} from "./secretNode";

export type RepoSecretsCommandArgs = Pick<RepoSecretsNode, "gitHubRepoContext">;

export class RepoSecretsNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super("Repository Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "secrets";
  }

  async getSecrets(): Promise<vscode.TreeItem[]> {
    let secrets: SecretNode[] = [];
    try {
      secrets = await this.gitHubRepoContext.client.paginate(
        this.gitHubRepoContext.client.actions.listRepoSecrets,
        {
          owner: this.gitHubRepoContext.owner,
          repo: this.gitHubRepoContext.name,
          per_page: 100
        },
        response => response.data.map(s => new SecretNode(this.gitHubRepoContext, s))
      );
    } catch (e) {
      await vscode.window.showErrorMessage((e as Error).message);
    }

    if (!secrets || secrets.length === 0) {
      return [new EmptyNode("No repository secrets defined")];
    }

    return secrets;
  }
}
