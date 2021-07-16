import * as vscode from "vscode";
import { GitHubRepoContext } from "../../git/repository";
import { WorkflowJob } from "../../model";
import { getIconForWorkflowRun } from "../icons";
import { WorkflowStepNode } from "./workflowStepNode";

export class WorkflowJobNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly job: WorkflowJob
  ) {
    super(
      job.name,
      (job.steps &&
        job.steps.length > 0 &&
        vscode.TreeItemCollapsibleState.Collapsed) ||
        undefined
    );

    this.contextValue = "job";
    if (this.job.status === "completed") {
      this.contextValue += " completed";
    }

    this.iconPath = getIconForWorkflowRun(this.job);
  }

  hasSteps(): boolean {
    return !!(this.job.steps && this.job.steps.length > 0);
  }

  async getSteps(): Promise<WorkflowStepNode[]> {
    return (this.job.steps || []).map(
      (s) => new WorkflowStepNode(this.gitHubRepoContext, this.job, s)
    );
  }
}
