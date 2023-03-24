import * as vscode from 'vscode'
import {GitHubRepoContext} from '../../git/repository'
import {Environment, EnvironmentVariable, OrgVariable, RepoVariable} from '../../model'

export type VariableCommandArgs = Pick<VariableNode, 'gitHubRepoContext' | 'variable' | 'environment'>

export class VariableNode extends vscode.TreeItem {
  constructor(gitHubRepoContext: GitHubRepoContext, variable: RepoVariable)
  constructor(gitHubRepoContext: GitHubRepoContext, variable: EnvironmentVariable, environment: Environment)
  constructor(githubRepoContext: GitHubRepoContext, variable: OrgVariable, environment: undefined, org: true)
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly variable: EnvironmentVariable | RepoVariable | OrgVariable,
    public readonly environment?: Environment,
    public readonly org?: boolean,
  ) {
    super(variable.name)
    this.description = variable.value

    this.contextValue = environment ? 'env-variable' : org ? 'org-variable' : 'repo-variable'
  }
}
