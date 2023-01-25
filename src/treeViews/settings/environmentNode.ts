import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {Environment} from "../../model";
import {EnvironmentSecretsNode} from "./environmentSecretsNode";
import {EnvironmentVariablesNode} from "./environmentVariablesNode";
import {SettingsExplorerNode} from "./types";

export class EnvironmentNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly environment: Environment) {
    super(environment.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "environment";
  }

  getNodes(): SettingsExplorerNode[] {
    return [
      new EnvironmentSecretsNode(this.gitHubRepoContext, this.environment),
      new EnvironmentVariablesNode(this.gitHubRepoContext, this.environment)
    ];
  }
}
