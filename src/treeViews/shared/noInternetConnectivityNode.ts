import * as vscode from "vscode";

/**
 * When no github.com remote can be found in the current workspace.
 */
export class NoInternetConnectivityNode extends vscode.TreeItem {
  constructor() {
    super("No internet connection");
    this.iconPath = new vscode.ThemeIcon("notebook-state-error");
  }
}
