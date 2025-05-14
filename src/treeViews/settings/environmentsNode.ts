import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {EnvironmentNode} from "./environmentNode";
import {Environment} from "../../model";

export class EnvironmentsNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super("Environments", vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon("server-environment");
  }

  async getEnvironments(): Promise<EnvironmentNode[]> {
    const opts = this.gitHubRepoContext.client.repos.getAllEnvironments.endpoint.merge({
      owner: this.gitHubRepoContext.owner,
      repo: this.gitHubRepoContext.name,
      per_page: 100
    });

    // retrieve all environments
    const result = await this.gitHubRepoContext.client.paginate<Environment>(opts);

    const data = result || [];
    return data.map(e => new EnvironmentNode(this.gitHubRepoContext, e));
  }
}
