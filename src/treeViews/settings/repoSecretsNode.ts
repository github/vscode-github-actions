import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {RepoSecretNode} from "./repoSecretNode";

export class RepoSecretsNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super("Repository Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "secrets";
  }

  async getSecrets(): Promise<vscode.TreeItem[]> {
    return await this.gitHubRepoContext.client.paginate(
      this.gitHubRepoContext.client.actions.listRepoSecrets,
      {
        owner: this.gitHubRepoContext.owner,
        repo: this.gitHubRepoContext.name,
        per_page: 100
      },
      response => response.data.map(s => new RepoSecretNode(this.gitHubRepoContext, s))
    );
  }
}
