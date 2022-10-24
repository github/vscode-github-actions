import * as vscode from "vscode";

import {GitHubRepoContext, getCurrentBranch} from "../../git/repository";

import {NoRunForBranchNode} from "./noRunForBranchNode";
import {WorkflowRunNode} from "../workflows/workflowRunNode";
import {logDebug} from "../../log";

export class CurrentBranchRepoNode extends vscode.TreeItem {
  constructor(public readonly gitHubRepoContext: GitHubRepoContext, public readonly currentBranchName: string) {
    super(gitHubRepoContext.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.description = currentBranchName;
    this.contextValue = "cb-repo";
  }

  async getRuns(): Promise<(WorkflowRunNode | NoRunForBranchNode)[]> {
    logDebug("Getting workflow runs for current branch");

    return (await getCurrentBranchWorkflowRunNodes(this.gitHubRepoContext)) || [];
  }
}

export async function getCurrentBranchWorkflowRunNodes(
  gitHubRepoContext: GitHubRepoContext
): Promise<(WorkflowRunNode | NoRunForBranchNode)[] | undefined> {
  const currentBranch = getCurrentBranch(gitHubRepoContext.repositoryState);
  if (!currentBranch) {
    logDebug(`Could not find current branch for ${gitHubRepoContext.name}`);
    return [];
  }

  const result = await gitHubRepoContext.client.actions.listWorkflowRunsForRepo({
    owner: gitHubRepoContext.owner,
    repo: gitHubRepoContext.name,
    branch: currentBranch
  });

  const resp = result.data;
  const runs = resp.workflow_runs;

  if (runs?.length == 0) {
    return [new NoRunForBranchNode()];
  }

  return runs.map(wr => {
    // TODO: Do we need to include the workflow name here?
    return new WorkflowRunNode(gitHubRepoContext, wr, wr.name ?? undefined);
  });
}
