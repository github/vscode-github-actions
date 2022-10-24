import * as vscode from "vscode";

export class AuthenticationNode extends vscode.TreeItem {
  constructor() {
    super("Please sign-in in the Accounts menu.");
  }
}
