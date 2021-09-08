import * as vscode from "vscode";
import { GitHubRepoContext } from "../../git/repository";
import { Workflow, WorkflowJob, WorkflowRun } from "../../model";
import { getIconForWorkflowRun } from "../icons";
import { WorkflowJobNode } from "./workflowJobNode";

export class WorkflowRunNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly workflow: Workflow,
    public readonly run: WorkflowRun
  ) {
    super(
      `#${run.id}`,
      (run.status === "completed" &&
        vscode.TreeItemCollapsibleState.Collapsed) ||
        undefined
    );

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

  hasJobs(): boolean {
    return this.run.status === "completed";
  }

  async getJobs(): Promise<WorkflowJobNode[]> {
    const result =
      await this.gitHubRepoContext.client.actions.listJobsForWorkflowRun({
        owner: this.gitHubRepoContext.owner,
        repo: this.gitHubRepoContext.name,
        run_id: this.run.id,
      });

    const resp = result.data;
    const jobs: WorkflowJob[] = (resp as any).jobs;

    return jobs.map((job) => new WorkflowJobNode(this.gitHubRepoContext, job));
  }
}
