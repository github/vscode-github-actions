import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {OrgSecret} from "../../model";
import {EmptyNode} from "./emptyNode";
import {SecretNode} from "./secretNode";

export class OrgSecretsNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super("Organization Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "org-secrets";
  }

  async getSecrets(): Promise<vscode.TreeItem[]> {
    let secrets: OrgSecret[] = [];
    try {
      secrets = await this.gitHubRepoContext.client.paginate("GET /repos/{owner}/{repo}/actions/organization-secrets", {
        owner: this.gitHubRepoContext.owner,
        repo: this.gitHubRepoContext.name,
        per_page: 100
      });
    } catch (e) {
      await vscode.window.showErrorMessage((e as Error).message);
    }

    if (!secrets || secrets.length === 0) {
      return [new EmptyNode("No organization secrets shared with this repository")];
    }

    return secrets.map(s => new SecretNode(this.gitHubRepoContext, s, undefined, true));
  }
}
