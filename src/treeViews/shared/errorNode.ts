import * as vscode from 'vscode';

export class ErrorNode extends vscode.TreeItem {
  constructor(message: string) {
    super(message);
  }
}
