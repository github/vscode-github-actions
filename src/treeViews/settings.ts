import * as vscode from 'vscode'

import {canReachGitHubAPI} from '../api/canReachGitHubAPI'
import {SettingsRepoNode, getSettingNodes} from './settings/settingsRepoNode'
import {EnvironmentNode} from './settings/environmentNode'
import {EnvironmentsNode} from './settings/environmentsNode'
import {RepoSecretsNode} from './settings/repoSecretsNode'
import {SecretsNode} from './settings/secretsNode'
import {SettingsExplorerNode} from './settings/types'
import {getGitHubContext} from '../git/repository'
import {RepoVariablesNode} from './settings/repoVariablesNode'
import {VariablesNode} from './settings/variablesNode'
import {EnvironmentSecretsNode} from './settings/environmentSecretsNode'
import {EnvironmentVariablesNode} from './settings/environmentVariablesNode'
import {OrgVariablesNode} from './settings/orgVariablesNode'
import {OrgSecretsNode} from './settings/orgSecretsNode'
import {GitHubAPIUnreachableNode} from './shared/gitHubApiUnreachableNode'

export class SettingsTreeProvider implements vscode.TreeDataProvider<SettingsExplorerNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SettingsExplorerNode | null>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  async refresh(): Promise<void> {
    // Don't delete all the nodes if we can't reach GitHub API
    if (await canReachGitHubAPI()) {
      this._onDidChangeTreeData.fire(null)
    } else {
      await vscode.window.showWarningMessage('Unable to refresh, could not reach GitHub API')
    }
  }

  getTreeItem(element: SettingsExplorerNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element
  }

  async getChildren(element?: SettingsExplorerNode | undefined): Promise<SettingsExplorerNode[]> {
    const gitHubContext = await getGitHubContext()
    if (!gitHubContext) {
      return [new GitHubAPIUnreachableNode()]
    }

    if (!element) {
      if (gitHubContext.repos.length > 0) {
        if (gitHubContext.repos.length == 1) {
          return getSettingNodes(gitHubContext.repos[0])
        }

        return gitHubContext.repos.map(r => new SettingsRepoNode(r))
      }
    }

    if (element instanceof SettingsRepoNode) {
      return element.getSettings()
    }

    //
    // Secrets
    //
    if (element instanceof SecretsNode) {
      return element.nodes
    }

    if (element instanceof RepoSecretsNode || element instanceof OrgSecretsNode) {
      return element.getSecrets()
    }

    //
    // Variables
    //
    if (element instanceof VariablesNode) {
      return element.nodes
    }

    if (element instanceof RepoVariablesNode || element instanceof OrgVariablesNode) {
      return element.getVariables()
    }

    //
    // Environments
    //

    if (element instanceof EnvironmentsNode) {
      return element.getEnvironments()
    }

    if (element instanceof EnvironmentNode) {
      return element.getNodes()
    }

    if (element instanceof EnvironmentSecretsNode) {
      return element.getSecrets()
    }

    if (element instanceof EnvironmentVariablesNode) {
      return element.getVariables()
    }

    return []
  }
}
