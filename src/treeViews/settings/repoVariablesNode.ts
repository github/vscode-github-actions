import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {VariableNode} from "./variableNode";

export type RepoVariablesCommandArgs = Pick<RepoVariablesNode, "gitHubRepoContext">;

export class RepoVariablesNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super("Repository Variables", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "repo-variables";
  }

  async getVariables(): Promise<vscode.TreeItem[]> {
    return await this.gitHubRepoContext.client.paginate(
      this.gitHubRepoContext.client.actions.listRepoVariables,
      {
        owner: this.gitHubRepoContext.owner,
        repo: this.gitHubRepoContext.name,
        per_page: 100
      },
      response => response.data.map(s => new VariableNode(this.gitHubRepoContext, s))
    );
  }
}
