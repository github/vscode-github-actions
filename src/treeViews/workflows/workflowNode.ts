import * as vscode from "vscode";

import {getPinnedWorkflows} from "../../configuration/configuration";
import {GitHubRepoContext} from "../../git/repository";
import {logDebug} from "../../log";
import {Workflow} from "../../model";
import {getWorkflowUri} from "../../workflow/workflow";
import {WorkflowRunNode} from "./workflowRunNode";

export class WorkflowNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly wf: Workflow,
    public readonly workflowContext?: string
  ) {
    super(wf.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.updateContextValue();
  }

  updateContextValue() {
    this.contextValue = "workflow";

    const workflowFullPath = getWorkflowUri(this.gitHubRepoContext, this.wf.path);
    if (workflowFullPath) {
      const relativeWorkflowPath = vscode.workspace.asRelativePath(workflowFullPath);
      if (new Set(getPinnedWorkflows()).has(relativeWorkflowPath)) {
        this.contextValue += " pinned";
      } else {
        this.contextValue += " pinnable";
      }
    }

    if (this.workflowContext) {
      this.contextValue += this.workflowContext;
    }
  }

  async getRuns(): Promise<WorkflowRunNode[]> {
    logDebug("Getting workflow runs");

    const result = await this.gitHubRepoContext.client.actions.listWorkflowRuns({
      owner: this.gitHubRepoContext.owner,
      repo: this.gitHubRepoContext.name,
      workflow_id: this.wf.id
    });

    const resp = result.data;
    const runs = resp.workflow_runs;

    return runs.map(wr => new WorkflowRunNode(this.gitHubRepoContext, wr));
  }
}
