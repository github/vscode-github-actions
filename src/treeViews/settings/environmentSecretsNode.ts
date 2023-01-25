import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {Environment} from "../../model";
import {EmptyNode} from "./emptyNode";
import {EnvironmentSecretNode} from "./environmentSecretNode";

export class EnvironmentSecretsNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly environment: Environment) {
    super("Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon("lock");
  }

  async getSecrets(): Promise<(EnvironmentSecretNode | EmptyNode)[]> {
    const result = await this.gitHubRepoContext.client.actions.listEnvironmentSecrets({
      repository_id: this.gitHubRepoContext.id,
      environment_name: this.environment.name
    });

    const data = result.data.secrets;
    if (!data || data.length === 0) {
      return [new EmptyNode("No environment secrets defined")];
    }

    return data.map(s => new EnvironmentSecretNode(this.gitHubRepoContext, s));
  }
}
