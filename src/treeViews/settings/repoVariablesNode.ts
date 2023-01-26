import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {VariableNode} from "./variableNode";

export class RepoVariablesNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super("Repository Variables", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "variables";
  }

  async getVariables(): Promise<vscode.TreeItem[]> {
    const result = await this.gitHubRepoContext.client.actions.listRepoVariables({
      owner: this.gitHubRepoContext.owner,
      repo: this.gitHubRepoContext.name
    });

    return result.data.variables.map(s => new VariableNode(this.gitHubRepoContext, s, "repo"));
  }
}
