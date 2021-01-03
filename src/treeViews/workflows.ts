import * as vscode from "vscode";

import { GitHubContext, getGitHubContext } from "../git/repository";
import { Workflow, WorkflowJob, WorkflowRun, WorkflowStep } from "../model";
import { getWorkflowUri, usesRepositoryDispatch } from "../workflow/workflow";

import { getIconForWorkflowRun } from "./icons";
import { parse } from "github-actions-parser";

/**
 * When no github.com remote can be found in the current workspace.
 */
class NoGitHubRepositoryNode extends vscode.TreeItem {
  constructor() {
    super("Did not find a github.com repository");
  }
}

/**
 * If there's no PAT set
 */
class AuthenticationNode extends vscode.TreeItem {
  constructor() {
    super("Please sign-in in the Accounts menu.");
  }
}

class ErrorNode extends vscode.TreeItem {
  constructor(message: string) {
    super(message);
  }
}

class WorkflowNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubContext: GitHubContext,
    public readonly wf: Workflow
  ) {
    super(wf.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "workflow";

    const workflowUri = getWorkflowUri(wf.path);
    if (workflowUri) {
      if (usesRepositoryDispatch(workflowUri.fsPath)) {
        this.contextValue += "rdispatch";
      }

      const workflow = parse(filename, input, schema, contextProviderFactory);
    }
  }

  async getRuns(): Promise<WorkflowRunNode[]> {
    const result = await this.gitHubContext.client.actions.listWorkflowRuns({
      owner: this.gitHubContext.owner,
      repo: this.gitHubContext.name,
      workflow_id: this.wf.id,
    });

    const resp = result.data;
    const runs = resp.workflow_runs;

    return runs.map(
      (wr) => new WorkflowRunNode(this.gitHubContext, this.wf, wr)
    );
  }
}

class WorkflowRunNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubContext: GitHubContext,
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

    this.command = {
      title: "Open run",
      command: "github-actions.workflow.run.open",
      arguments: [this],
    };
  }

  hasJobs(): boolean {
    return this.run.status === "completed";
  }

  async getJobs(): Promise<WorkflowJobNode[]> {
    const result = await this.gitHubContext.client.actions.listJobsForWorkflowRun(
      {
        owner: this.gitHubContext.owner,
        repo: this.gitHubContext.name,
        run_id: this.run.id,
      }
    );

    const resp = result.data;
    const jobs: WorkflowJob[] = (resp as any).jobs;

    return jobs.map((job) => new WorkflowJobNode(this.gitHubContext, job));
  }

  get tooltip(): string {
    return `${this.run.status} - ${this.run.conclusion}`;
  }

  get iconPath() {
    return getIconForWorkflowRun(this.run);
  }
}

class WorkflowJobNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubContext: GitHubContext,
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
  }

  hasSteps(): boolean {
    return this.job.steps && this.job.steps.length > 0;
  }

  async getSteps(): Promise<WorkflowStepNode[]> {
    return this.job.steps.map(
      (s) => new WorkflowStepNode(this.gitHubContext, this.job, s)
    );
  }

  get iconPath() {
    return getIconForWorkflowRun(this.job);
  }
}

class WorkflowStepNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubContext: GitHubContext,
    public readonly job: WorkflowJob,
    public readonly step: WorkflowStep
  ) {
    super(step.name);

    this.contextValue = "step";
    if (this.step.status === "completed") {
      this.contextValue += " completed";
    }

    this.command = {
      title: "Open run",
      command: "github-actions.workflow.logs",
      arguments: [this],
    };
  }

  get iconPath() {
    return getIconForWorkflowRun(this.step);
  }
}

type ActionsExplorerNode =
  | AuthenticationNode
  | NoGitHubRepositoryNode
  | WorkflowNode
  | WorkflowRunNode
  | WorkflowStepNode;

export class ActionsExplorerProvider
  implements vscode.TreeDataProvider<ActionsExplorerNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ActionsExplorerNode | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(
    element: ActionsExplorerNode
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(
    element?: ActionsExplorerNode | undefined
  ): Promise<ActionsExplorerNode[]> {
    if (element && element instanceof WorkflowNode) {
      return element.getRuns();
    } else if (
      element &&
      element instanceof WorkflowRunNode &&
      element.hasJobs()
    ) {
      return element.getJobs();
    } else if (
      element &&
      element instanceof WorkflowJobNode &&
      element.hasSteps()
    ) {
      return element.getSteps();
    } else {
      try {
        const gitHubContext = await getGitHubContext();
        if (!gitHubContext) {
          return [];
        }

        const result = await gitHubContext.client.actions.listRepoWorkflows({
          owner: gitHubContext.owner,
          repo: gitHubContext.name,
        });
        const response = result.data;

        const workflows = response.workflows;
        workflows.sort((a, b) => a.name.localeCompare(b.name));

        return workflows.map((wf) => new WorkflowNode(gitHubContext, wf));
      } catch (e) {
        if (
          `${e?.message}`.startsWith(
            "Could not get token from the GitHub provider."
          )
        ) {
          return [new AuthenticationNode()];
        }

        return [new ErrorNode(`An error has occured: ${e.message}`)];
      }
    }
  }
}
