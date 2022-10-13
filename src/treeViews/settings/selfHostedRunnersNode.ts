import * as vscode from 'vscode';
import {GitHubRepoContext} from '../../git/repository';
import {SelfHostedRunnerNode} from './selfHostedRunnerNode';

export class SelfHostedRunnersNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super('Self-hosted runners', vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'runners';
    this.iconPath = new vscode.ThemeIcon('server');
  }

  async getRunners(): Promise<vscode.TreeItem[]> {
    const result = await this.gitHubRepoContext.client.actions.listSelfHostedRunnersForRepo({
      owner: this.gitHubRepoContext.owner,
      repo: this.gitHubRepoContext.name
    });

    const data = result.data.runners || [];
    return data.map(r => new SelfHostedRunnerNode(this.gitHubRepoContext, r));
  }
}
