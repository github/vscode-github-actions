import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {Environment, EnvironmentVariable, RepoVariable} from "../../model";

export type VariableCommandArgs = Pick<VariableNode, "gitHubRepoContext" | "variable" | "environment">;

export class VariableNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly variable: EnvironmentVariable | RepoVariable,
    public readonly environment?: Environment
  ) {
    super(variable.name);
    this.description = variable.value;

    this.contextValue = environment ? "env-variable" : "repo-variable";
  }
}
