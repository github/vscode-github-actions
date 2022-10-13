import * as vscode from 'vscode';

export class EmptyEnvironmentSecretsNode extends vscode.TreeItem {
  constructor() {
    super('No environment secrets defined');
  }
}
