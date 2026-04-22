import * as vscode from "vscode";

import {WorkflowJob as WorkflowJobModel} from "../model";
import {WorkflowJob} from "../store/WorkflowJob";
import {WorkflowJobCommandArgs, WorkflowJobNode} from "../treeViews/shared/workflowJobNode";

export function registerReRunWorkflowJobWithDebug(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.workflow.job.rerunDebug", async (args: WorkflowJobCommandArgs) => {
      const gitHubRepoContext = args.gitHubRepoContext;
      const job = args.job;
      const jobId = job.job.id;
      const runId = job.job.run_id;
      const jobName = job.job.name;

      if (!jobId) {
        await vscode.window.showErrorMessage("Unable to re-run workflow job: missing job id.");
        return;
      }

      if (!runId) {
        await vscode.window.showErrorMessage("Unable to re-run workflow job: missing run id.");
        return;
      }

      try {
        await gitHubRepoContext.client.request("POST /repos/{owner}/{repo}/actions/jobs/{job_id}/rerun", {
          owner: gitHubRepoContext.owner,
          repo: gitHubRepoContext.name,
          job_id: jobId,
          enable_debug_logging: true
        });
      } catch (e) {
        await vscode.window.showErrorMessage(
          `Could not re-run workflow job with debug logging: '${(e as Error).message}'`
        );
        return;
      }

      WorkflowJobNode.setStatusOverride(runId, jobName, "pending", null);
      await refreshWorkflowViews();

      const updatedJob = await pollJobRunning(gitHubRepoContext, runId, jobName, 15, 1000);
      if (!updatedJob) {
        await vscode.window.showWarningMessage("Job did not start running within 15 seconds.");
        return;
      }

      await vscode.commands.executeCommand("github-actions.workflow.job.attachDebugger", {
        gitHubRepoContext,
        job: new WorkflowJob(gitHubRepoContext, updatedJob)
      });
    })
  );
}

async function pollJobRunning(
  gitHubRepoContext: WorkflowJobCommandArgs["gitHubRepoContext"],
  runId: number,
  jobName: string,
  attempts: number,
  delayMs: number
): Promise<WorkflowJobModel | undefined> {
  const rerunStart = Date.now();
  for (let attempt = 0; attempt < attempts; attempt++) {
    const job = await getJobByName(gitHubRepoContext, runId, jobName, rerunStart);
    if (job?.status === "in_progress") {
      await clearStatusOverride(runId, jobName);
      return job;
    }

    await delay(delayMs);
  }

  await clearStatusOverride(runId, jobName);
  return undefined;
}

async function getJobByName(
  gitHubRepoContext: WorkflowJobCommandArgs["gitHubRepoContext"],
  runId: number,
  jobName: string,
  rerunStart: number
): Promise<WorkflowJobModel | undefined> {
  try {
    const response = await gitHubRepoContext.client.actions.listJobsForWorkflowRun({
      owner: gitHubRepoContext.owner,
      repo: gitHubRepoContext.name,
      run_id: runId,
      per_page: 100
    });

    const jobs = response.data.jobs ?? [];
    const matching = jobs.filter(job => job.name === jobName);
    if (matching.length === 0) {
      return undefined;
    }

    const sorted = matching.sort((left, right) => {
      const leftStart = left.started_at ? Date.parse(left.started_at) : 0;
      const rightStart = right.started_at ? Date.parse(right.started_at) : 0;
      return rightStart - leftStart;
    });

    const newest = sorted[0];
    if (newest.started_at) {
      const startedAt = Date.parse(newest.started_at);
      if (!Number.isNaN(startedAt) && startedAt < rerunStart - 5000) {
        return undefined;
      }
    }

    return newest;
  } catch {
    return undefined;
  }
}

async function refreshWorkflowViews(): Promise<void> {
  await Promise.all([
    vscode.commands.executeCommand("github-actions.explorer.refresh"),
    vscode.commands.executeCommand("github-actions.explorer.current-branch.refresh")
  ]);
}

async function clearStatusOverride(runId: number, jobName: string): Promise<void> {
  WorkflowJobNode.clearStatusOverride(runId, jobName);
  await refreshWorkflowViews();
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
