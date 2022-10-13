import * as vscode from 'vscode';

/**
 * When no github.com remote can be found in the current workspace.
 */
export class NoGitHubRepositoryNode extends vscode.TreeItem {
  constructor() {
    super('Did not find a github.com repository');
  }
}
