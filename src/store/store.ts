import {setInterval} from "timers";
import {EventEmitter} from "vscode";
import {GitHubRepoContext} from "../git/repository";
import {logDebug} from "../log";
import {WorkflowRun} from "../model";

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

  /**
   * Update the given run and inform any listener
   */
  updateRun(run: WorkflowRun) {
    this.runs.set(run.id, run);
    this.fire({run});
  }

  /**
   * Start polling for updates for the given run
   */
  pollRun(runId: number, repoContext: GitHubRepoContext, intervalMs: number, attempts = 10) {
    let updater: Updater | undefined = this.updaters.get(runId);
    if (updater) {
      clearInterval(updater.handle);
    }

    updater = {
      intervalMs,
      repoContext,
      runId,
      remainingAttempts: attempts,
      handle: undefined
    };

    updater.handle = setInterval(async () => this.fetchRun(updater!), intervalMs);

    this.updaters.set(runId, updater);
  }

  private async fetchRun(updater: Updater) {
    logDebug("Updating run: " + updater.runId);

    updater.remainingAttempts--;
    if (updater.remainingAttempts === 0) {
      clearInterval(updater.handle);
      this.updaters.delete(updater.runId);
    }

    const result = await updater.repoContext.client.actions.getWorkflowRun({
      owner: updater.repoContext.owner,
      repo: updater.repoContext.name,
      run_id: updater.runId
    });

    const run = result.data;
    this.updateRun(run);
  }
}
