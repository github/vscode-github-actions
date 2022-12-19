import * as vscode from "vscode";

import {WorkflowJob, WorkflowRun} from "../../model";

import {GitHubRepoContext} from "../../git/repository";
import {logDebug} from "../../log";
import {getIconForWorkflowRun} from "../icons";
import {NoWorkflowJobsNode} from "./noWorkflowJobsNode";
import {WorkflowJobNode} from "./workflowJobNode";

export class WorkflowRunNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public run: WorkflowRun,
    public readonly workflowName?: string
  ) {
    super(WorkflowRunNode._getLabel(run, workflowName), vscode.TreeItemCollapsibleState.Collapsed);

    this.updateRun(run);
  }

  updateRun(run: WorkflowRun) {
    this.run = run;

    this.label = WorkflowRunNode._getLabel(run, this.workflowName);

    this.contextValue = "run";
    if (this.run.status !== "completed") {
      this.contextValue += " cancelable";
    }

    if (this.run.status === "completed" && this.run.conclusion !== "success") {
      this.contextValue += " rerunnable";
    }

    if (this.run.status === "completed") {
      this.contextValue += " completed";
    }

    this.iconPath = getIconForWorkflowRun(this.run);
    this.tooltip = `${this.run.status || ""} ${this.run.conclusion || ""}`;
  }

  async getJobs(): Promise<(WorkflowJobNode | NoWorkflowJobsNode)[]> {
    logDebug("Getting workflow jobs");

    const result = await this.gitHubRepoContext.client.actions.listJobsForWorkflowRun({
      owner: this.gitHubRepoContext.owner,
      repo: this.gitHubRepoContext.name,
      run_id: this.run.id
    });

    const resp = result.data;
    const jobs: WorkflowJob[] = resp.jobs;
    if (jobs.length === 0) {
      return [new NoWorkflowJobsNode()];
    }

    return jobs.map(job => new WorkflowJobNode(this.gitHubRepoContext, job));
  }

  private static _getLabel(run: WorkflowRun, workflowName?: string): string {
    return `${workflowName ? workflowName + " " : ""}#${run.id}`;
  }
}
