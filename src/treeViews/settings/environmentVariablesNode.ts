import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {Environment} from "../../model";
import {EmptyNode} from "./emptyNode";
import {VariableNode} from "./variableNode";

export class EnvironmentVariablesNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly environment: Environment) {
    super("Variables", vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon("symbol-text");
  }

  async getVariables(): Promise<(VariableNode | EmptyNode)[]> {
    const variables = await this.gitHubRepoContext.client.paginate(
      this.gitHubRepoContext.client.actions.listEnvironmentVariables,
      {
        repository_id: this.gitHubRepoContext.id,
        environment_name: this.environment.name,
        per_page: 100
      },
      response => response.data.map(v => new VariableNode(this.gitHubRepoContext, v, "env"))
    );

    if (!variables || variables.length === 0) {
      return [new EmptyNode("No environment variables defined")];
    }

    return variables;
  }
}
