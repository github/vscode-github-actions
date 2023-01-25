import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {EnvironmentVariable} from "../../model";

export class EnvironmentVariableNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly variable: EnvironmentVariable) {
    super(variable.name);

    this.contextValue = "env-variable";
  }
}
