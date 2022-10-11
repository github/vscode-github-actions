import * as vscode from "vscode";
import { GitHubRepoContext } from "../../git/repository";
import { EnvironmentNode } from "./environmentNode";

export class EnvironmentsNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super("Environments", vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon("server-environment");
  }

  async getEnvironments(): Promise<EnvironmentNode[]> {
    const result = await this.gitHubRepoContext.client.repos.getAllEnvironments(
      {
        owner: this.gitHubRepoContext.owner,
        repo: this.gitHubRepoContext.name,
      }
    );

    const data = result.data.environments || [];
    return data.map((e) => new EnvironmentNode(this.gitHubRepoContext, e));
  }
}
