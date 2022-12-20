import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {WorkflowRunAttempt} from "../../store/workflowRun";
import {getIconForWorkflowRun} from "../icons";
import {WorkflowJobNode} from "./workflowJobNode";

export class AttemptNode extends vscode.TreeItem {
  constructor(private gitHubRepoContext: GitHubRepoContext, private attempt: WorkflowRunAttempt) {
    super(`Attempt #${attempt.attempt}`, vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = getIconForWorkflowRun(this.attempt.run);
    this.tooltip = `#${this.attempt.attempt}: ${this.attempt.run.status || ""} ${this.attempt.run.conclusion || ""}`;
  }

  async getJobs(): Promise<WorkflowJobNode[]> {
    const jobs = await this.attempt.jobs();

    return jobs.map(job => new WorkflowJobNode(this.gitHubRepoContext, job));
  }
}
