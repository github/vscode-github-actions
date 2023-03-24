import * as vscode from 'vscode'

import {EnvironmentsNode} from './environmentsNode'
import {GitHubRepoContext} from '../../git/repository'
import {hasWritePermission} from '../../git/repository-permissions'
import {SecretsNode} from './secretsNode'
import {SettingsExplorerNode} from './types'
import {VariablesNode} from './variablesNode'

export class SettingsRepoNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super(gitHubRepoContext.name, vscode.TreeItemCollapsibleState.Collapsed)

    this.contextValue = 'settings-repo'
  }

  getSettings(): SettingsExplorerNode[] {
    return getSettingNodes(this.gitHubRepoContext)
  }
}

export function getSettingNodes(gitHubContext: GitHubRepoContext): SettingsExplorerNode[] {
  const nodes: SettingsExplorerNode[] = []

  nodes.push(new EnvironmentsNode(gitHubContext))

  if (hasWritePermission(gitHubContext.permissionLevel)) {
    nodes.push(new SecretsNode(gitHubContext))
    nodes.push(new VariablesNode(gitHubContext))
  }

  return nodes
}
