import * as vscode from 'vscode'

import {GitHubRepoContext} from '../../git/repository'

export class CurrentBranchRepoNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly currentBranchName: string) {
    super(gitHubRepoContext.name, vscode.TreeItemCollapsibleState.Collapsed)

    this.description = currentBranchName
    this.contextValue = 'cb-repo'
  }
}
