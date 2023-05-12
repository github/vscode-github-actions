import * as vscode from "vscode";

import {EnvironmentsNode} from "./environmentsNode";
import {GitHubContext, GitHubRepoContext, hasVariables} from "../../git/repository";
import {hasWritePermission} from "../../git/repository-permissions";
import {SecretsNode} from "./secretsNode";
import {SettingsExplorerNode} from "./types";
import {VariablesNode} from "./variablesNode";

export class SettingsRepoNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly gitHubContext: GitHubContext) {
    super(gitHubRepoContext.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "settings-repo";
  }

  getSettings(): SettingsExplorerNode[] {
    return getSettingNodes(this.gitHubRepoContext, this.gitHubContext);
  }
}

export function getSettingNodes(repoContext: GitHubRepoContext, gitHubContext: GitHubContext): SettingsExplorerNode[] {
  const nodes: SettingsExplorerNode[] = [];

  nodes.push(new EnvironmentsNode(repoContext));

  if (hasWritePermission(repoContext.permissionLevel)) {
    nodes.push(new SecretsNode(repoContext));
    if (hasVariables(gitHubContext)) {
      nodes.push(new VariablesNode(repoContext));
    }
  }

  return nodes;
}
