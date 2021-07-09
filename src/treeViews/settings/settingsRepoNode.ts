import * as vscode from "vscode";
import { GitHubRepoContext } from "../../git/repository";
import { EnvironmentsNode } from "./environmentsNode";
import { SecretsNode } from "./secretsNode";
import { SelfHostedRunnersNode } from "./selfHostedRunnersNode";
import { SettingsExplorerNode } from "./types";

export class SettingsRepoNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super(gitHubRepoContext.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "settings-repo";
  }

  async getSettings(): Promise<SettingsExplorerNode[]> {
    return [
      new SelfHostedRunnersNode(this.gitHubRepoContext),
      new SecretsNode(this.gitHubRepoContext),
      new EnvironmentsNode(this.gitHubRepoContext),
    ];
  }
}
