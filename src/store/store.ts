import {setInterval} from "timers";
import {EventEmitter} from "vscode";
import {GitHubRepoContext} from "../git/repository";
import {logDebug} from "../log";
import * as model from "../model";
import {WorkflowRun} from "./workflowRun";

export interface RunStoreEvent {
  run: WorkflowRun;
}

type Updater = {
  intervalMs: number;
  remainingAttempts: number;
  repoContext: GitHubRepoContext;
  runId: number;
  handle: NodeJS.Timeout | undefined;
};

export class RunStore extends EventEmitter<RunStoreEvent> {
  private runs = new Map<number, WorkflowRun>();
  private updaters = new Map<number, Updater>();

  getRun(runId: number): WorkflowRun | undefined {
    return this.runs.get(runId);
  }

  addRun(gitHubRepoContext: GitHubRepoContext, runData: model.WorkflowRun): WorkflowRun {
    let run = this.runs.get(runData.id);
    if (!run) {
      run = new WorkflowRun(gitHubRepoContext, runData);

      logDebug("[Store]: adding run: ", runData.id, runData.updated_at);
    } else {
      run.updateRun(runData);

      logDebug("[Store]: updating run: ", runData.id, runData.updated_at);
    }

    this.runs.set(runData.id, run);
    this.fire({run});
    return run;
  }

  /**
   * Start polling for updates for the given run
   */
  pollRun(runId: number, repoContext: GitHubRepoContext, intervalMs: number, attempts = 10) {
    const existingUpdater: Updater | undefined = this.updaters.get(runId);
    if (existingUpdater && existingUpdater.handle) {
      clearInterval(existingUpdater.handle);
    }

    const updater: Updater = {
      intervalMs,
      repoContext,
      runId,
      remainingAttempts: attempts,
      handle: undefined
    };

    updater.handle = setInterval(() => void this.fetchRun(updater), intervalMs);

    this.updaters.set(runId, updater);
  }

  private async fetchRun(updater: Updater) {
    logDebug("Updating run: ", updater.runId);

    updater.remainingAttempts--;
    if (updater.remainingAttempts === 0) {
      if (updater.handle) {
        clearInterval(updater.handle);
      }

      this.updaters.delete(updater.runId);
    }

    const result = await updater.repoContext.client.actions.getWorkflowRun({
      owner: updater.repoContext.owner,
      repo: updater.repoContext.name,
      run_id: updater.runId
    });

    const run = result.data;
    logDebug("Polled run:", run.id, "Status:", run.status, "Conclusion:", run.conclusion);
    this.addRun(updater.repoContext, run);

    if (run.status === "completed" || run.status === "cancelled" || run.status === "failure" || run.status === "success" || run.status === "skipped" || run.status === "timed_out") {
      if (updater.handle) {
        clearInterval(updater.handle);
      }
      this.updaters.delete(updater.runId);
    }
  }
}
