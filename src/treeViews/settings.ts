import * as vscode from "vscode";

import {SettingsRepoNode, getSettingNodes} from "./settings/settingsRepoNode";

import {EnvironmentNode} from "./settings/environmentNode";
import {EnvironmentsNode} from "./settings/environmentsNode";
import {RepoSecretsNode} from "./settings/repoSecretsNode";
import {SecretsNode} from "./settings/secretsNode";
import {SettingsExplorerNode} from "./settings/types";
import {getGitHubContext} from "../git/repository";
import {RepoVariablesNode} from "./settings/repoVariablesNode";
import {VariablesNode} from "./settings/variablesNode";
import {EnvironmentSecretsNode} from "./settings/environmentSecretsNode";
import {EnvironmentVariablesNode} from "./settings/environmentVariablesNode";
import {OrgVariablesNode} from "./settings/orgVariablesNode";
import {OrgSecretsNode} from "./settings/orgSecretsNode";
import {NoInternetConnectivityNode} from "./shared/noInternetConnectivityNode";

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
      return [new NoInternetConnectivityNode()];
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
      return element.nodes;
    }

    if (element instanceof RepoSecretsNode || element instanceof OrgSecretsNode) {
      return element.getSecrets();
    }

    //
    // Variables
    //
    if (element instanceof VariablesNode) {
      return element.nodes;
    }

    if (element instanceof RepoVariablesNode || element instanceof OrgVariablesNode) {
      return element.getVariables();
    }

    //
    // Environments
    //

    if (element instanceof EnvironmentsNode) {
      return element.getEnvironments();
    }

    if (element instanceof EnvironmentNode) {
      return element.getNodes();
    }

    if (element instanceof EnvironmentSecretsNode) {
      return element.getSecrets();
    }

    if (element instanceof EnvironmentVariablesNode) {
      return element.getVariables();
    }

    return [];
  }
}
