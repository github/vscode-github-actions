import {setInterval} from "timers";
import {EventEmitter} from "vscode";
import {GitHubRepoContext} from "../git/repository";
import {log, logDebug} from "../log";
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

      log("Adding run: ", runData.id, runData.updated_at);
    } else {
      run.updateRun(runData);

      log("Updating run: ", runData.id, runData.updated_at);
    }

    this.runs.set(runData.id, run);
    this.fire({run});
    return run;
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
    this.addRun(updater.repoContext, run);
  }
}
