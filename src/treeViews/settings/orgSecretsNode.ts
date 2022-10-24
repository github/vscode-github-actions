import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {OrgFeaturesNode} from "./orgFeaturesNode";
import {OrgSecretNode} from "./orgSecretNode";

export class OrgSecretsNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super("Organization Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "org-secrets";
  }

  async getSecrets(): Promise<vscode.TreeItem[]> {
    if (!this.gitHubRepoContext.orgFeaturesEnabled) {
      return [new OrgFeaturesNode()];
    }

    const result = await this.gitHubRepoContext.client.actions.listOrgSecrets({
      org: this.gitHubRepoContext.owner
    });

    return result.data.secrets.map(s => new OrgSecretNode(this.gitHubRepoContext, s));
  }
}
