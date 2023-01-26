import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {EnvironmentVariable, RepoVariable} from "../../model";

export class VariableNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly variable: EnvironmentVariable | RepoVariable,
    public readonly contextPrefix: string
  ) {
    super(variable.name);
    this.description = variable.value;

    this.contextValue = contextPrefix ? `${contextPrefix}-variable` : "variable";
  }
}
