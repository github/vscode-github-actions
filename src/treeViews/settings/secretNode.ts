import * as vscode from 'vscode'
import {GitHubRepoContext} from '../../git/repository'
import {Environment, EnvironmentSecret, OrgSecret, RepoSecret} from '../../model'

export type SecretCommandArgs = Pick<SecretNode, 'gitHubRepoContext' | 'secret' | 'environment'>

export class SecretNode extends vscode.TreeItem {
  constructor(gitHubRepoContext: GitHubRepoContext, secret: RepoSecret)
  constructor(gitHubRepoContext: GitHubRepoContext, secret: EnvironmentSecret, environment: Environment)
  constructor(githubRepoContext: GitHubRepoContext, secret: OrgSecret, environment: undefined, org: true)
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly secret: RepoSecret | EnvironmentSecret | OrgSecret,
    public readonly environment?: Environment,
    public readonly org?: boolean,
  ) {
    super(secret.name)

    this.contextValue = environment ? 'env-secret' : org ? 'org-secret' : 'repo-secret'
  }
}
