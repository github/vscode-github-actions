import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {Environment} from "../../model";
import {EmptyEnvironmentSecretsNode} from "./emptyEnvironmentSecretsNode";
import {EnvironmentSecretNode} from "./environmentSecretNode";

export class EnvironmentNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly environment: Environment) {
    super(environment.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "environment";
  }

  async getSecrets(): Promise<(EnvironmentSecretNode | EmptyEnvironmentSecretsNode)[]> {
    const result = await this.gitHubRepoContext.client.actions.listEnvironmentSecrets({
      repository_id: this.gitHubRepoContext.id,
      environment_name: this.environment.name
    });

    const data = result.data.secrets;
    if (!data) {
      return [new EmptyEnvironmentSecretsNode()];
    }

    return data.map(s => new EnvironmentSecretNode(this.gitHubRepoContext, s));
  }
}
