import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {OrgVariable} from "../../model";
import {EmptyNode} from "./emptyNode";
import {VariableNode} from "./variableNode";

export class OrgVariablesNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super("Organization Variables", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "org-variables";
  }

  async getVariables(): Promise<vscode.TreeItem[]> {
    let variables: OrgVariable[] = [];
    try {
      variables = await this.gitHubRepoContext.client.paginate(
        "GET /repos/{owner}/{repo}/actions/organization-variables",
        {
          owner: this.gitHubRepoContext.owner,
          repo: this.gitHubRepoContext.name,
          per_page: 100
        }
      );
    } catch (e) {
      await vscode.window.showErrorMessage((e as Error).message);
    }

    if (!variables || variables.length === 0) {
      return [new EmptyNode("No organization variables shared with this repository")];
    }

    return variables.map(s => new VariableNode(this.gitHubRepoContext, s, undefined, true));
  }
}
