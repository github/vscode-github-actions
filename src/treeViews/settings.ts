import * as vscode from "vscode";
import { getGitHubProtocol } from "../git/repository";
import { getPAT } from "../auth/pat";
import { getClient } from "../api/api";
import { OctokitWithActions } from "../typings/api";
import { createInterface } from "readline";
import { Secret } from "../model";
import { Protocol } from "../external/protocol";

class SelfHostedRunnersNode extends vscode.TreeItem {
  constructor() {
    super("Self-hosted runners", vscode.TreeItemCollapsibleState.Collapsed);
  }
}

class SecretsNode extends vscode.TreeItem {
  constructor(
    public readonly repo: Protocol,
    public readonly client: OctokitWithActions
  ) {
    super("Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "secrets";
  }
}

class SecretNode extends vscode.TreeItem {
  constructor(
    public readonly repo: Protocol,
    public readonly secret: Secret,
    public readonly client: OctokitWithActions
  ) {
    super(secret.name);

    this.contextValue = "secret";
  }
}

type SettingsExplorerNode = SelfHostedRunnersNode | SecretsNode | SecretNode;

export class SettingsTreeProvider
  implements vscode.TreeDataProvider<SettingsExplorerNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    SettingsExplorerNode
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(
    element: SettingsExplorerNode
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(
    element?: SettingsExplorerNode | undefined
  ): Promise<SettingsExplorerNode[]> {
    // TODO: Extract this common code
    const repo = await getGitHubProtocol();
    if (!repo) {
      return [];
    }

    // Get token
    const token = await getPAT();
    if (!token) {
      return [];
    }

    const client = getClient(token);

    if (!element) {
      // Root
      return [new SelfHostedRunnersNode(), new SecretsNode(repo, client)];
    }

    if (element instanceof SecretsNode) {
      const result = await client.actions.getSecrets({
        owner: repo.owner,
        repo: repo.repositoryName
      });
      const secrets = result.data.secrets as Secret[];
      return secrets.map(s => new SecretNode(repo, s, client));
    }

    return [];
  }
}
