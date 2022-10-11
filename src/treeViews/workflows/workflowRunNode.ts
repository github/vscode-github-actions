import * as vscode from "vscode";

import { WorkflowJob, WorkflowRun } from "../../model";

import { GitHubRepoContext } from "../../git/repository";
import { WorkflowJobNode } from "./workflowJobNode";
import { getIconForWorkflowRun } from "../icons";
import { logDebug } from "../../log";

export class WorkflowRunNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly run: WorkflowRun,
    public readonly workflowName?: string
  ) {
    super(`${workflowName ? workflowName + " " : ""}#${run.id}`, vscode.TreeItemCollapsibleState.Collapsed);

    this.description = `${run.event} (${(run.head_sha || "").substr(0, 7)})`;

    this.contextValue = "run";
    if (this.run.status !== "completed") {
      this.contextValue += " cancelable";
    }

    if (this.run.status === "completed" && this.run.conclusion !== "success") {
      this.contextValue += " rerunnable";
    }

    if (this.run.status === "completed") {
      this.contextValue += "completed";
    }

    this.iconPath = getIconForWorkflowRun(this.run);
    this.tooltip = `${this.run.status} ${this.run.conclusion || ""}`;
  }

  async getJobs(): Promise<WorkflowJobNode[]> {
    logDebug("Getting workflow jobs");

    const result = await this.gitHubRepoContext.client.actions.listJobsForWorkflowRun({
      owner: this.gitHubRepoContext.owner,
      repo: this.gitHubRepoContext.name,
      run_id: this.run.id,
    });

    const resp = result.data;
    const jobs: WorkflowJob[] = (resp as any).jobs;

    return jobs.map((job) => new WorkflowJobNode(this.gitHubRepoContext, job));
  }
}
