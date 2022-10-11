import * as vscode from "vscode";
import { GitHubRepoContext } from "../../git/repository";
import { EnvironmentSecret } from "../../model";

export class EnvironmentSecretNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly secret: EnvironmentSecret
  ) {
    super(secret.name);

    this.contextValue = "env-secret";
  }
}
