import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";

export class SecretsNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super("Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon("lock");
  }
}
