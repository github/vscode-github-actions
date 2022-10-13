import * as vscode from 'vscode';

export class OrgFeaturesNode extends vscode.TreeItem {
  constructor() {
    super('GitHub token does not have `admin:org` scope');
    this.description = 'Click here to authorize';

    this.command = {
      title: 'Login',
      command: 'github-actions.auth.org-login'
    };
  }
}
