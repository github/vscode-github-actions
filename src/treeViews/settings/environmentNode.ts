import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {hasWritePermission} from "../../git/repository-permissions";
import {Environment} from "../../model";
import {EnvironmentSecretsNode} from "./environmentSecretsNode";
import {EnvironmentVariablesNode} from "./environmentVariablesNode";
import {SettingsExplorerNode} from "./types";

export class EnvironmentNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly environment: Environment
  ) {
    const state = hasWritePermission(gitHubRepoContext.permissionLevel)
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;
    super(environment.name, state);

    this.contextValue = "environment";
  }

  getNodes(): SettingsExplorerNode[] {
    return [
      new EnvironmentSecretsNode(this.gitHubRepoContext, this.environment),
      new EnvironmentVariablesNode(this.gitHubRepoContext, this.environment)
    ];
  }
}
