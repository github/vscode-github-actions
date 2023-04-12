import * as vscode from "vscode";
import {GitHubRepoContext} from "../git/repository";
import {RepositoryPermission, hasWritePermission} from "../git/repository-permissions";
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

  duration(): number {
    if (this.run.run_started_at) {
      const started_at = new Date(this.run.run_started_at);

      const updated_at = new Date(this.run.updated_at);
      return updated_at.getTime() - started_at.getTime();
    }
    return 0;
  }

  updateRun(run: model.WorkflowRun) {
    if (this._run.status !== "completed" || this._run.updated_at !== run.updated_at) {
      // Refresh jobs if the run is not completed or it was updated (i.e. re-run)
      // For in-progress runs, we can't rely on updated at to change when jobs change
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

  contextValue(permission: RepositoryPermission): string {
    const contextValues = ["run"];
    const completed = this._run.status === "completed";
    if (hasWritePermission(permission)) {
      contextValues.push(completed ? "rerunnable" : "cancelable");
    }
    if (completed) {
      contextValues.push("completed");
    }
    return contextValues.join(" ");
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

    let jobs: model.WorkflowJob[] = [];

    try {
      jobs = await this._gitHubRepoContext.client.paginate(
        this._gitHubRepoContext.client.actions.listJobsForWorkflowRun,
        {
          owner: this._gitHubRepoContext.owner,
          repo: this._gitHubRepoContext.name,
          run_id: this.run.id,
          per_page: 100
        }
      );
    } catch (e) {
      await vscode.window.showErrorMessage((e as Error).message);
    }

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
    let jobs: model.WorkflowJob[] = [];

    try {
      jobs = await this._gitHubRepoContext.client.paginate(
        this._gitHubRepoContext.client.actions.listJobsForWorkflowRunAttempt,
        {
          owner: this._gitHubRepoContext.owner,
          repo: this._gitHubRepoContext.name,
          run_id: this.run.id,
          attempt_number: this.attempt,
          per_page: 100
        }
      );
    } catch (e) {
      await vscode.window.showErrorMessage((e as Error).message);
    }

    return jobs.map(j => new WorkflowJob(this._gitHubRepoContext, j));
  }
}
