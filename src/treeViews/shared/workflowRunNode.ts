import * as vscode from "vscode";

import {GitHubRepoContext} from "../../git/repository";
import {RunStore} from "../../store/store";
import {WorkflowRun} from "../../store/workflowRun";
import {getIconForWorkflowRun} from "../icons";
import {NoWorkflowJobsNode} from "./noWorkflowJobsNode";
import {PreviousAttemptsNode} from "./previousAttemptsNode";
import {WorkflowJobNode} from "./workflowJobNode";

export type WorkflowRunCommandArgs = Pick<WorkflowRunNode, "gitHubRepoContext" | "run" | "store">;

export class WorkflowRunNode extends vscode.TreeItem {
  constructor(
    public readonly store: RunStore,
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
    if (this.run.run.status !== "completed") {
      this.contextValue += " cancelable";
    }

    if (this.run.run.status === "completed") {
      this.contextValue += " rerunnable";
    }

    if (this.run.run.status === "completed") {
      this.contextValue += " completed";
    }

    this.iconPath = getIconForWorkflowRun(this.run.run);
    this.tooltip = `${this.run.run.status || ""} ${this.run.run.conclusion || ""}`;
  }

  async getJobs(): Promise<(WorkflowJobNode | NoWorkflowJobsNode | PreviousAttemptsNode)[]> {
    const jobs = await this.run.jobs();

    const children: (WorkflowJobNode | NoWorkflowJobsNode | PreviousAttemptsNode)[] = jobs.map(
      job => new WorkflowJobNode(this.gitHubRepoContext, job)
    );

    if (this.run.hasPreviousAttempts) {
      children.push(new PreviousAttemptsNode(this.gitHubRepoContext, this.run));
    }

    return children;
  }

  private static _getLabel(run: WorkflowRun, workflowName?: string): string {
    return `${workflowName ? workflowName + " " : ""}#${run.run.id}`;
  }
}
