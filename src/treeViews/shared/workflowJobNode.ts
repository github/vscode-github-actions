import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {WorkflowJob} from "../../store/workflowRun";
import {getIconForWorkflowRun} from "../icons";
import {WorkflowStepNode} from "../workflows/workflowStepNode";

export class WorkflowJobNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly job: WorkflowJob) {
    super(
      job.job.name,
      (job.job.steps && job.job.steps.length > 0 && vscode.TreeItemCollapsibleState.Collapsed) || undefined
    );

    this.contextValue = "job";
    if (this.job.job.status === "completed") {
      this.contextValue += " completed";
    }

    this.iconPath = getIconForWorkflowRun(this.job.job);
  }

  hasSteps(): boolean {
    return !!(this.job.job.steps && this.job.job.steps.length > 0);
  }

  getSteps(): WorkflowStepNode[] {
    return (this.job.job.steps || []).map(s => new WorkflowStepNode(this.gitHubRepoContext, this.job, s));
  }
}
