import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {RepoVariable} from "../../model";

export class RepoVariableNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly variable: RepoVariable) {
    super(variable.name);

    this.contextValue = "variable";
  }
}
