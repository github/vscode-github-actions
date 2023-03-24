import * as vscode from 'vscode'

/**
 * Shown when no calls to the github API can be made.
 */
export class GitHubAPIUnreachableNode extends vscode.TreeItem {
  constructor() {
    super('Cannot reach GitHub API')
    this.iconPath = new vscode.ThemeIcon('notebook-state-error')
  }
}
