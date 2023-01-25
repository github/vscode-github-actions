import * as vscode from "vscode";

export class EmptyNode extends vscode.TreeItem {
  constructor(message: string) {
    super(message);
  }
}
