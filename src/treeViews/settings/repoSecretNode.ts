import * as vscode from 'vscode';
import {GitHubRepoContext} from '../../git/repository';
import {RepoSecret} from '../../model';

export class RepoSecretNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly secret: RepoSecret) {
    super(secret.name);

    this.contextValue = 'secret';
  }
}
