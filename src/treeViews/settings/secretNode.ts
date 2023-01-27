import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {Environment, EnvironmentSecret, RepoSecret} from "../../model";

export type SecretCommandArgs = Pick<SecretNode, "gitHubRepoContext" | "secret" | "environment">;

export class SecretNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly secret: RepoSecret | EnvironmentSecret,
    public readonly environment?: Environment
  ) {
    super(secret.name);

    this.contextValue = environment ? "env-secret" : "repo-secret";
  }
}
