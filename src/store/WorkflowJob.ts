import {GitHubRepoContext} from '../git/repository'
import * as model from '../model'

export class WorkflowJob {
  readonly job: model.WorkflowJob
  private gitHubRepoContext: GitHubRepoContext

  constructor(gitHubRepoContext: GitHubRepoContext, job: model.WorkflowJob) {
    this.gitHubRepoContext = gitHubRepoContext
    this.job = job
  }
}
