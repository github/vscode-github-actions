import * as vscode from "vscode";
import { getGitHubContext, GitHubContext } from "../git/repository";
import {
  Environment,
  EnvironmentSecret,
  OrgSecret,
  RepoSecret,
  SelfHostedRunner,
} from "../model";
import { getAbsoluteIconPath } from "./icons";

class OrgFeaturesNode extends vscode.TreeItem {
  constructor() {
    super("GitHub token does not have `admin:org` scope");
    this.description = "Click here to authorize";

    this.command = {
      title: "Login",
      command: "github-actions.auth.org-login",
    };
  }
}

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
    this.tooltip = this.selfHostedRunner.status;
    this.iconPath = getAbsoluteIconPath(
      this.selfHostedRunner.status == "online"
        ? "runner-online.svg"
        : "runner-offline.svg"
    );
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

class EnvironmentsNode extends vscode.TreeItem {
  constructor(public readonly gitHubContext: GitHubContext) {
    super("Environments", vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon("server-environment");
  }
}

class EnvironmentNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubContext: GitHubContext,
    public readonly environment: Environment
  ) {
    super(environment.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "environment";
  }
}

class EnvironmentSecretNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubContext: GitHubContext,
    public readonly secret: EnvironmentSecret
  ) {
    super(secret.name);

    this.contextValue = "env-secret";
  }
}

class EmptyEnvironmentSecretsNode extends vscode.TreeItem {
  constructor() {
    super("No environment secrets defined");
  }
}

type SettingsExplorerNode =
  | OrgFeaturesNode
  | SelfHostedRunnersNode
  | SecretsNode
  | RepoSecretNode
  | OrgSecretNode
  | EnvironmentsNode
  | EnvironmentNode
  | EnvironmentSecretNode
  | EmptyEnvironmentSecretsNode;

export class SettingsTreeProvider
  implements vscode.TreeDataProvider<SettingsExplorerNode>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<SettingsExplorerNode | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
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
        new EnvironmentsNode(gitHubContext),
      ];
    }

    //
    // Secrets
    //

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
      if (!gitHubContext.orgFeaturesEnabled) {
        return [new OrgFeaturesNode()];
      }

      const result = await gitHubContext.client.actions.listOrgSecrets({
        org: gitHubContext.owner,
      });

      return result.data.secrets.map(
        (s) => new OrgSecretNode(gitHubContext, s)
      );
    }

    if (element instanceof SelfHostedRunnersNode) {
      const result =
        await gitHubContext.client.actions.listSelfHostedRunnersForRepo({
          owner: gitHubContext.owner,
          repo: gitHubContext.name,
        });

      const data = result.data.runners || [];
      return data.map((r) => new SelfHostedRunnerNode(gitHubContext, r));
    }

    //
    // Environments
    //

    if (element instanceof EnvironmentsNode) {
      const result = await gitHubContext.client.repos.getAllEnvironments({
        owner: gitHubContext.owner,
        repo: gitHubContext.name,
      });

      const data = result.data.environments || [];
      return data.map((e) => new EnvironmentNode(gitHubContext, e));
    }

    if (element instanceof EnvironmentNode) {
      const result = await gitHubContext.client.actions.listEnvironmentSecrets({
        repository_id: gitHubContext.id,
        environment_name: element.environment.name,
      });

      const data = result.data.secrets;
      if (!data) {
        return [new EmptyEnvironmentSecretsNode()];
      }

      return data.map((s) => new EnvironmentSecretNode(gitHubContext, s));
    }

    return [];
  }
}
