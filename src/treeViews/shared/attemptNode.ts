import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {WorkflowRunAttempt} from "../../store/workflowRun";
import {getIconForWorkflowNode} from "../icons";
import {getEventString, getStatusString} from "./runTooltipHelper";
import {WorkflowJobNode} from "./workflowJobNode";

export class AttemptNode extends vscode.TreeItem {
  constructor(
    private gitHubRepoContext: GitHubRepoContext,
    private attempt: WorkflowRunAttempt
  ) {
    super(`Attempt #${attempt.attempt}`, vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = getIconForWorkflowNode(this.attempt.run);
    this.tooltip = this.getTooltip();
  }

  getTooltip(): vscode.MarkdownString {
    let markdownString = `#${this.attempt.attempt}: `;

    markdownString += getStatusString(this.attempt);
    markdownString += `\n\n`;
    markdownString += getEventString(this.attempt);

    return new vscode.MarkdownString(markdownString);
  }

  async getJobs(): Promise<WorkflowJobNode[]> {
    const jobs = await this.attempt.jobs();

    return jobs.map(job => new WorkflowJobNode(this.gitHubRepoContext, job));
  }
}
