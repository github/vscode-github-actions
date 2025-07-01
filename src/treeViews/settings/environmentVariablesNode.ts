import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {Environment} from "../../model";
import {EmptyNode} from "./emptyNode";
import {VariableNode} from "./variableNode";

export type EnvironmentVariablesCommandArgs = Pick<EnvironmentVariablesNode, "gitHubRepoContext" | "environment">;

export class EnvironmentVariablesNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly environment: Environment
  ) {
    super("Variables", vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon("symbol-text");

    this.contextValue = "environment-variables";
  }

  async getVariables(): Promise<(VariableNode | EmptyNode)[]> {
    let variables: VariableNode[] = [];
    try {
      variables = await this.gitHubRepoContext.client.paginate(
        // @ts-expect-error FIXME: Newer Typescript catches a problem that previous didn't. This will be fixed in Octokit bump.
        this.gitHubRepoContext.client.actions.listEnvironmentVariables,
        {
          owner: this.gitHubRepoContext.owner,
          repo: this.gitHubRepoContext.name,
          environment_name: this.environment.name,
          per_page: 100
        },
        // @ts-expect-error FIXME: Newer Typescript catches a problem that previous didn't. This will be fixed in Octokit bump.
        response => response.data.map(v => new VariableNode(this.gitHubRepoContext, v, this.environment))
      );
    } catch (e) {
      await vscode.window.showErrorMessage((e as Error).message);
    }

    if (!variables || variables.length === 0) {
      return [new EmptyNode("No environment variables defined")];
    }

    return variables;
  }
}
