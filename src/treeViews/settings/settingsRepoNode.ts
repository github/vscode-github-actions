import * as vscode from "vscode";

import { EnvironmentsNode } from "./environmentsNode";
import { GitHubRepoContext } from "../../git/repository";
import { SecretsNode } from "./secretsNode";
import { SelfHostedRunnersNode } from "./selfHostedRunnersNode";
import { SettingsExplorerNode } from "./types";

export class SettingsRepoNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super(gitHubRepoContext.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "settings-repo";
  }

  async getSettings(): Promise<SettingsExplorerNode[]> {
    return getSettingNodes(this.gitHubRepoContext);
  }
}

export function getSettingNodes(
  gitHubContext: GitHubRepoContext
): SettingsExplorerNode[] {
  const nodes: SettingsExplorerNode[] = [];

  nodes.push(new EnvironmentsNode(gitHubContext));
  nodes.push(new SecretsNode(gitHubContext));
  nodes.push(new SelfHostedRunnersNode(gitHubContext));

  return nodes;
}
