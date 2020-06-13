import * as vscode from "vscode";
import { getGitHubContext, GitHubContext } from "../git/repository";
import { OrgSecret, RepoSecret, SelfHostedRunner } from "../model";
import { getAbsoluteIconPath } from "./icons";

class SelfHostedRunnersNode extends vscode.TreeItem {
  constructor(public readonly gitHubContext: GitHubContext) {
    super("Self-hosted runners", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "runners";
    this.iconPath = new vscode.ThemeIcon("server");
  }
}

class SelfHostedRunnerNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubContext: GitHubContext,
    public readonly selfHostedRunner: SelfHostedRunner
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
  constructor(public readonly gitHubContext: GitHubContext) {
    super("Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon("lock");
  }
}

class RepoSecretsNode extends vscode.TreeItem {
  constructor(public readonly gitHubContext: GitHubContext) {
    super("Repository Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "secrets";
  }
}

class RepoSecretNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubContext: GitHubContext,
    public readonly secret: RepoSecret
  ) {
    super(secret.name);

    this.contextValue = "secret";
  }
}

class OrgSecretsNode extends vscode.TreeItem {
  constructor(public readonly gitHubContext: GitHubContext) {
    super("Organization Secrets", vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "org-secrets";
  }
}

class OrgSecretNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubContext: GitHubContext,
    public readonly secret: OrgSecret
  ) {
    super(secret.name);

    this.description = this.secret.visibility;
    this.contextValue = "org-secret";
  }
}

type SettingsExplorerNode =
  | SelfHostedRunnersNode
  | SecretsNode
  | RepoSecretNode
  | OrgSecretNode;

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
    const gitHubContext = await getGitHubContext();
    if (!gitHubContext) {
      return [];
    }

    if (!element) {
      // Root
      return [
        new SelfHostedRunnersNode(gitHubContext),
        new SecretsNode(gitHubContext),
      ];
    }

    if (element instanceof SecretsNode) {
      const nodes = [new RepoSecretsNode(gitHubContext)];

      if (gitHubContext.ownerIsOrg) {
        nodes.push(new OrgSecretsNode(gitHubContext));
      }

      return nodes;
    }

    if (element instanceof RepoSecretsNode) {
      const result = await gitHubContext.client.actions.listRepoSecrets({
        owner: gitHubContext.owner,
        repo: gitHubContext.name,
      });

      return result.data.secrets.map(
        (s) => new RepoSecretNode(gitHubContext, s)
      );
    }

    if (element instanceof OrgSecretsNode) {
      const result = await gitHubContext.client.actions.listOrgSecrets({
        org: gitHubContext.owner,
      });

      return result.data.secrets.map(
        (s) => new OrgSecretNode(gitHubContext, s)
      );
    }

    if (element instanceof SelfHostedRunnersNode) {
      const result = await gitHubContext.client.actions.listSelfHostedRunnersForRepo(
        {
          owner: gitHubContext.owner,
          repo: gitHubContext.name,
        }
      );

      const data = result.data.runners || [];
      return data.map((r) => new SelfHostedRunnerNode(gitHubContext, r));
    }

    return [];
  }
}
