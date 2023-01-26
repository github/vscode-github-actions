import * as vscode from "vscode";

import {SettingsRepoNode, getSettingNodes} from "./settings/settingsRepoNode";

import {EnvironmentNode} from "./settings/environmentNode";
import {EnvironmentsNode} from "./settings/environmentsNode";
import {RepoSecretsNode} from "./settings/repoSecretsNode";
import {SecretsNode} from "./settings/secretsNode";
import {SelfHostedRunnersNode} from "./settings/selfHostedRunnersNode";
import {SettingsExplorerNode} from "./settings/types";
import {getGitHubContext} from "../git/repository";
import {RepoVariablesNode} from "./settings/repoVariablesNode";
import {VariablesNode} from "./settings/variablesNode";

export class SettingsTreeProvider implements vscode.TreeDataProvider<SettingsExplorerNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SettingsExplorerNode | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: SettingsExplorerNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(element?: SettingsExplorerNode | undefined): Promise<SettingsExplorerNode[]> {
    const gitHubContext = await getGitHubContext();
    if (!gitHubContext) {
      return [];
    }

    if (!element) {
      if (gitHubContext.repos.length > 0) {
        if (gitHubContext.repos.length == 1) {
          return getSettingNodes(gitHubContext.repos[0]);
        }

        return gitHubContext.repos.map(r => new SettingsRepoNode(r));
      }
    }

    if (element instanceof SettingsRepoNode) {
      return element.getSettings();
    }

    //
    // Secrets
    //
    if (element instanceof SecretsNode) {
      return [new RepoSecretsNode(element.gitHubRepoContext)];
    }

    if (element instanceof RepoSecretsNode) {
      return element.getSecrets();
    }

    //
    // Variables
    //
    if (element instanceof VariablesNode) {
      return [new RepoVariablesNode(element.gitHubRepoContext)];
    }

    if (element instanceof RepoVariablesNode) {
      return element.getVariables();
    }

    //
    // Self-hosted runners
    //
    if (element instanceof SelfHostedRunnersNode) {
      return element.getRunners();
    }

    //
    // Environments
    //

    if (element instanceof EnvironmentsNode) {
      return element.getEnvironments();
    }

    if (element instanceof EnvironmentNode) {
      return element.getSecrets();
    }

    return [];
  }
}
