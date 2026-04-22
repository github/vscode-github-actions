import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {WorkflowJob} from "../../store/WorkflowJob";
import {getIconForWorkflowRun} from "../icons";
import {WorkflowStepNode} from "../workflows/workflowStepNode";

export type WorkflowJobCommandArgs = Pick<WorkflowJobNode, "gitHubRepoContext" | "job">;

export class WorkflowJobNode extends vscode.TreeItem {
  private static readonly statusOverrides = new Map<string, {status: string; conclusion?: string | null}>();

  static setStatusOverride(runId: number, jobName: string, status: string, conclusion?: string | null): void {
    const key = this.buildStatusKey(runId, jobName);
    if (!key) {
      return;
    }

    this.statusOverrides.set(key, {status, conclusion});
  }

  static clearStatusOverride(runId: number, jobName: string): void {
    const key = this.buildStatusKey(runId, jobName);
    if (!key) {
      return;
    }

    this.statusOverrides.delete(key);
  }

  private static getStatusOverride(job: WorkflowJob): {status: string; conclusion?: string | null} | undefined {
    const key = this.buildStatusKey(job.job.run_id, job.job.name);
    if (!key) {
      return undefined;
    }

    return this.statusOverrides.get(key);
  }

  private static buildStatusKey(runId: number | undefined, jobName: string | undefined): string | undefined {
    if (!runId || !jobName) {
      return undefined;
    }

    return `${runId}:${jobName}`;
  }

  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly job: WorkflowJob) {
    super(
      job.job.name,
      (job.job.steps && job.job.steps.length > 0 && vscode.TreeItemCollapsibleState.Collapsed) || undefined
    );

    const override = WorkflowJobNode.getStatusOverride(job);
    const status = override?.status ?? job.job.status;
    const conclusion = override?.conclusion ?? job.job.conclusion;

    this.contextValue = "job";
    if (status === "completed") {
      this.contextValue += " completed";
    } else if (status === "in_progress") {
      this.contextValue += " running";
    }

    if (conclusion === "failure") {
      this.contextValue += " failed";
    }

    this.iconPath = getIconForWorkflowRun({status: status ?? "", conclusion: conclusion ?? null});
  }

  hasSteps(): boolean {
    return !!(this.job.job.steps && this.job.job.steps.length > 0);
  }

  getSteps(): WorkflowStepNode[] {
    return (this.job.job.steps || []).map(s => new WorkflowStepNode(this.gitHubRepoContext, this.job, s));
  }
}
