import * as vscode from "vscode";

/**
 * Shown when no calls to the github API can be made.
 */
export class NoInternetConnectivityNode extends vscode.TreeItem {
  constructor() {
    super("No internet connection");
    this.iconPath = new vscode.ThemeIcon("notebook-state-error");
  }
}
