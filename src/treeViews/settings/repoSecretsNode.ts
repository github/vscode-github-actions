import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {SecretNode} from "./secretNode";

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
      response => response.data.map(s => new SecretNode(this.gitHubRepoContext, s))
    );
  }
}
