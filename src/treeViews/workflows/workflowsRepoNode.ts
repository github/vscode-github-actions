import * as vscode from "vscode";

import {GitHubRepoContext} from "../../git/repository";
import {logDebug} from "../../log";
import {getContextStringForWorkflow, getWorkflowUri} from "../../workflow/workflow";
import {WorkflowNode} from "./workflowNode";
import {Workflow} from "../../model";

export class WorkflowsRepoNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext) {
    super(gitHubRepoContext.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "wf-repo";
  }

  async getWorkflows(): Promise<WorkflowNode[]> {
    logDebug("Getting workflows");

    return getWorkflowNodes(this.gitHubRepoContext);
  }
}

export async function getWorkflowNodes(gitHubRepoContext: GitHubRepoContext) {
  const opts = gitHubRepoContext.client.actions.listRepoWorkflows.endpoint.merge({
    owner: gitHubRepoContext.owner,
    repo: gitHubRepoContext.name,
    per_page: 100
  });

  // retrieve all pages
  const workflows = await gitHubRepoContext.client.paginate<Workflow>(opts);

  workflows.sort((a, b) => a.name.localeCompare(b.name));

  return await Promise.all(
    workflows.map(async wf => {
      const workflowUri = getWorkflowUri(gitHubRepoContext, wf.path);
      const workflowContext = await getContextStringForWorkflow(workflowUri);
      const nameWithoutNewlines = wf.name.replace(/(\r\n|\n|\r)/gm, " ");

      // We are removing all newline characters from the workflow name for presentation purposes
      wf.name = nameWithoutNewlines;

      return new WorkflowNode(gitHubRepoContext, wf, workflowContext);
    })
  );
}
