import * as vscode from "vscode";
import { GitHubRepoContext } from "../../git/repository";
import { WorkflowNode } from "./workflowNode";

export class WorkflowsRepoNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super(gitHubRepoContext.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "workflows-repo";
  }

  async getWorkflows(): Promise<WorkflowNode[]> {
    const result =
      await this.gitHubRepoContext.client.actions.listRepoWorkflows({
        owner: this.gitHubRepoContext.owner,
        repo: this.gitHubRepoContext.name,
      });

    const resp = result.data;
    const workflows = resp.workflows;

    return workflows.map((wf) => new WorkflowNode(this.gitHubRepoContext, wf));
  }
}
