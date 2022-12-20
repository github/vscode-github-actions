import {GitHubRepoContext} from "../git/repository";
import {logDebug} from "../log";
import * as model from "../model";

export class WorkflowRun {
  private _gitHubRepoContext: GitHubRepoContext;
  private _run: model.WorkflowRun;
  private _jobs: Promise<WorkflowJob[]> | undefined;

  constructor(gitHubRepoContext: GitHubRepoContext, run: model.WorkflowRun) {
    this._gitHubRepoContext = gitHubRepoContext;
    this._run = run;
  }

  get run(): model.WorkflowRun {
    return this._run;
  }

  updateRun(run: model.WorkflowRun) {
    if (this._run.updated_at !== run.updated_at) {
      // Run has changed, reset jobs
      this._jobs = undefined;
    }

    this._run = run;
  }

  jobs(): Promise<WorkflowJob[]> {
    if (!this._jobs) {
      this._jobs = this.fetchJobs();
    }

    return this._jobs;
  }

  private async fetchJobs(): Promise<WorkflowJob[]> {
    logDebug("Getting workflow jobs");

    const result = await this._gitHubRepoContext.client.actions.listJobsForWorkflowRun({
      owner: this._gitHubRepoContext.owner,
      repo: this._gitHubRepoContext.name,
      run_id: this.run.id
    });

    const resp = result.data;
    const jobs: model.WorkflowJob[] = resp.jobs;
    return jobs.map(j => new WorkflowJob(this._gitHubRepoContext, j));
  }
}

export class WorkflowJob {
  readonly job: model.WorkflowJob;
  private gitHubRepoContext: GitHubRepoContext;

  constructor(gitHubRepoContext: GitHubRepoContext, job: model.WorkflowJob) {
    this.gitHubRepoContext = gitHubRepoContext;
    this.job = job;
  }
}
