import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {Environment} from "../../model";
import {EmptyNode} from "./emptyNode";
import {EnvironmentVariableNode} from "./environmentVariableNode";

export class EnvironmentVariablesNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly environment: Environment) {
    super("Variables", vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon("symbol-text");
  }

  async getVariables(): Promise<(EnvironmentVariableNode | EmptyNode)[]> {
    const result = await this.gitHubRepoContext.client.actions.listEnvironmentVariables({
      repository_id: this.gitHubRepoContext.id,
      environment_name: this.environment.name
    });

    const data = result.data.variables;
    if (!data || data.length === 0) {
      return [new EmptyNode("No environment variables defined")];
    }

    return data.map(s => new EnvironmentVariableNode(this.gitHubRepoContext, s));
  }
}
