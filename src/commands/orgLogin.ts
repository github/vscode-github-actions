import * as vscode from 'vscode';

import {enableOrgFeatures} from '../auth/auth';

export function registerOrgLogin(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('github-actions.auth.org-login', async () => {
      enableOrgFeatures();
    })
  );
}
