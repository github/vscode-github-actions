import { ActionsListSecretsForRepoResponseItem } from "@octokit/rest";
import * as vscode from "vscode";
import { getClient } from "../api/api";
import { getPAT } from "../auth/pat";
import { Protocol } from "../external/protocol";
import { getGitHubProtocol } from "../git/repository";
import { Secret, SelfHostedRunner } from "../model";
import { getAbsoluteIconPath } from "./icons";
import Octokit = require("@octokit/rest");

class SelfHostedRunnersNode extends vscode.TreeItem {
  constructor(public readonly repo: Protocol, public readonly client: Octokit) {
    super("Self-hosted runners", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "runners";
  }
}

class SelfHostedRunnerNode extends vscode.TreeItem {
  constructor(
    public readonly repo: Protocol,
    public readonly selfHostedRunner: SelfHostedRunner,
    public readonly client: Octokit
  ) {
    super(selfHostedRunner.name);

    this.contextValue = "runner";
  }

  get tooltip(): string {
    return this.selfHostedRunner.status;
  }

  get iconPath() {
    const iconPath =
      this.selfHostedRunner.status == "online"
        ? "runner-online.svg"
        : "runner-offline.svg";

    return getAbsoluteIconPath(iconPath);
  }
}

class SecretsNode extends vscode.TreeItem {
  constructor(public readonly repo: Protocol, public readonly client: Octokit) {
    super("Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "secrets";
  }
}

class SecretNode extends vscode.TreeItem {
  constructor(
    public readonly repo: Protocol,
    public readonly secret: Secret,
    public readonly client: Octokit
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
      return [
        new SelfHostedRunnersNode(repo, client),
        new SecretsNode(repo, client),
      ];
    }

    if (element instanceof SecretsNode) {
      const result = await client.actions.listSecretsForRepo({
        owner: repo.owner,
        repo: repo.repositoryName,
      });
      // Work around bad typings/docs
      const data = (result.data as any) as ActionsListSecretsForRepoResponseItem;
      const secrets = data.secrets;
      return secrets.map((s) => new SecretNode(repo, s, client));
    }

    if (element instanceof SelfHostedRunnersNode) {
      const result = await client.actions.listSelfHostedRunnersForRepo({
        owner: repo.owner,
        repo: repo.repositoryName,
      });

      result.data;

      // Work around typing issues with the consumed octokit version
      const data: any[] = (result.data as any).runners || [];
      return data.map((r) => new SelfHostedRunnerNode(repo, r, client));
    }

    return [];
  }
}
