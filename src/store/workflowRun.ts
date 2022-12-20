import {GitHubRepoContext} from "../git/repository";
import {log, logDebug} from "../log";
import * as model from "../model";
import {WorkflowJob} from "./WorkflowJob";

abstract class WorkflowRunBase {
  protected _gitHubRepoContext: GitHubRepoContext;
  protected _run: model.WorkflowRun;

  private _jobs: Promise<WorkflowJob[]> | undefined;

  constructor(gitHubRepoContext: GitHubRepoContext, run: model.WorkflowRun) {
    this._gitHubRepoContext = gitHubRepoContext;
    this._run = run;
  }

  get run(): model.WorkflowRun {
    return this._run;
  }

  get hasPreviousAttempts(): boolean {
    return (this.run.run_attempt || 1) > 1;
  }

  updateRun(run: model.WorkflowRun) {
    if (this._run.updated_at !== run.updated_at) {
      // Run has changed, reset jobs. Note: this doesn't work in all cases, there might be race conditions
      // where the run update_at field isn't set but the jobs change, but in the vast majority of cases the
      // combined status/conclusion of the run is updated whenever a job changes, so this should be good enough
      // for now to reduce the # of API calls
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

  protected abstract fetchJobs(): Promise<WorkflowJob[]>;
}

export class WorkflowRun extends WorkflowRunBase {
  private _attempts: Promise<WorkflowRunAttempt[]> | undefined;

  constructor(gitHubRepoContext: GitHubRepoContext, run: model.WorkflowRun) {
    super(gitHubRepoContext, run);
  }

  override async fetchJobs(): Promise<WorkflowJob[]> {
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

  attempts(): Promise<WorkflowRunAttempt[]> {
    if (!this._attempts) {
      this._attempts = this._updateAttempts();
    }

    return this._attempts;
  }

  private async _updateAttempts(): Promise<WorkflowRunAttempt[]> {
    const attempts: WorkflowRunAttempt[] = [];

    const attempt = this.run.run_attempt || 1;
    if (attempt > 1) {
      for (let i = 1; i < attempt; i++) {
        const runAttemptResp = await this._gitHubRepoContext.client.actions.getWorkflowRunAttempt({
          owner: this._gitHubRepoContext.owner,
          repo: this._gitHubRepoContext.name,
          run_id: this._run.id,
          attempt_number: i
        });
        if (runAttemptResp.status !== 200) {
          log(
            "Failed to get workflow run attempt",
            this._run.id,
            "for attempt",
            i,
            runAttemptResp.status,
            runAttemptResp.data
          );
          continue;
        }

        const runAttempt = runAttemptResp.data;
        attempts.push(new WorkflowRunAttempt(this._gitHubRepoContext, runAttempt, i));
      }
    }

    return attempts;
  }
}

export class WorkflowRunAttempt extends WorkflowRunBase {
  public readonly attempt: number;

  constructor(gitHubRepoContext: GitHubRepoContext, run: model.WorkflowRunAttempt, attempt: number) {
    super(gitHubRepoContext, run);

    this.attempt = attempt;
  }

  override async fetchJobs(): Promise<WorkflowJob[]> {
    logDebug("Getting workflow run attempt jobs", this._run.id, "for attempt", this.attempt);

    const result = await this._gitHubRepoContext.client.actions.listJobsForWorkflowRunAttempt({
      owner: this._gitHubRepoContext.owner,
      repo: this._gitHubRepoContext.name,
      run_id: this._run.id,
      attempt_number: this.attempt
    });

    const resp = result.data;
    const jobs: model.WorkflowJob[] = resp.jobs;
    return jobs.map(j => new WorkflowJob(this._gitHubRepoContext, j));
  }
}
