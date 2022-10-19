import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {OrgSecret} from "../../model";

export class OrgSecretNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly secret: OrgSecret) {
    super(secret.name);

    this.description = this.secret.visibility;
    this.contextValue = "org-secret";
  }
}
