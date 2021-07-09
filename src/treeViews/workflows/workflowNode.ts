import { Workflow as ParsedWorkflow } from "github-actions-parser/dist/lib/workflow";
import * as vscode from "vscode";
import { GitHubRepoContext } from "../../git/repository";
import { Workflow } from "../../model";
import { WorkflowRunNode } from "./workflowRunNode";

export class WorkflowNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly wf: Workflow,
    public readonly parsed?: ParsedWorkflow
  ) {
    super(wf.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "workflow";

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
    const result = await this.gitHubRepoContext.client.actions.listWorkflowRuns(
      {
        owner: this.gitHubRepoContext.owner,
        repo: this.gitHubRepoContext.name,
        workflow_id: this.wf.id,
      }
    );

    const resp = result.data;
    const runs = resp.workflow_runs;

    return runs.map(
      (wr) => new WorkflowRunNode(this.gitHubRepoContext, this.wf, wr)
    );
  }
}
