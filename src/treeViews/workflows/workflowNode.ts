import * as vscode from "vscode";

import { GitHubRepoContext } from "../../git/repository";
import { Workflow as ParsedWorkflow } from "github-actions-parser/dist/lib/workflow";
import { Workflow } from "../../model";
import { WorkflowRunNode } from "./workflowRunNode";
import { getPinnedWorkflows } from "../../configuration/configuration";
import { getWorkflowUri } from "../../workflow/workflow";
import { logDebug } from "../../log";

export class WorkflowNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly wf: Workflow,
    public readonly parsed?: ParsedWorkflow
  ) {
    super(wf.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.updateContextValue();
  }

  updateContextValue() {
    this.contextValue = "workflow";

    const workflowFullPath = getWorkflowUri(
      this.gitHubRepoContext,
      this.wf.path
    );
    if (workflowFullPath) {
      const relativeWorkflowPath =
        vscode.workspace.asRelativePath(workflowFullPath);
      if (new Set(getPinnedWorkflows()).has(relativeWorkflowPath)) {
        this.contextValue += " pinned";
      } else {
        this.contextValue += " pinnable";
      }
    }

    if (this.parsed) {
      if (this.parsed.on.repository_dispatch !== undefined) {
        this.contextValue += " rdispatch";
      }

      if (this.parsed.on.workflow_dispatch !== undefined) {
        this.contextValue += " wdispatch";
      }
    }
  }

  async getRuns(): Promise<WorkflowRunNode[]> {
    logDebug("Getting workflow runs");

    const result = await this.gitHubRepoContext.client.actions.listWorkflowRuns(
      {
        owner: this.gitHubRepoContext.owner,
        repo: this.gitHubRepoContext.name,
        workflow_id: this.wf.id,
      }
    );

    const resp = result.data;
    const runs = resp.workflow_runs;

    return runs.map((wr) => new WorkflowRunNode(this.gitHubRepoContext, wr));
  }
}
