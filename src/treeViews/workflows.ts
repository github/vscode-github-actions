import * as vscode from "vscode";

import {getGitHubContext} from "../git/repository";
import {log, logDebug, logError} from "../log";
import {RunStore} from "../store/store";
import {AttemptNode} from "./shared/attemptNode";
import {AuthenticationNode} from "./shared/authenticationNode";
import {ErrorNode} from "./shared/errorNode";
import {NoInternetConnectivityNode} from "./shared/noInternetConnectivityNode";
import {NoGitHubRepositoryNode} from "./shared/noGitHubRepositoryNode";
import {NoWorkflowJobsNode} from "./shared/noWorkflowJobsNode";
import {PreviousAttemptsNode} from "./shared/previousAttemptsNode";
import {WorkflowJobNode} from "./shared/workflowJobNode";
import {WorkflowRunNode} from "./shared/workflowRunNode";
import {WorkflowRunTreeDataProvider} from "./workflowRunTreeDataProvider";
import {WorkflowNode} from "./workflows/workflowNode";
import {getWorkflowNodes, WorkflowsRepoNode} from "./workflows/workflowsRepoNode";
import {WorkflowStepNode} from "./workflows/workflowStepNode";
import {hasInternetConnectivity} from "../util";

type WorkflowsTreeNode =
  | AuthenticationNode
  | NoGitHubRepositoryNode
  | WorkflowNode
  | WorkflowRunNode
  | PreviousAttemptsNode
  | AttemptNode
  | WorkflowJobNode
  | NoWorkflowJobsNode
  | WorkflowStepNode
  | NoInternetConnectivityNode;

export class WorkflowsTreeProvider
  extends WorkflowRunTreeDataProvider
  implements vscode.TreeDataProvider<WorkflowsTreeNode>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<WorkflowsTreeNode | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(store: RunStore) {
    super(store);
  }

  protected _updateNode(node: WorkflowRunNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  async refresh(): Promise<void> {
    // Don't delete all the nodes if we don't have internet connectivity
    if (await hasInternetConnectivity()) {
      this._onDidChangeTreeData.fire(null);
    } else {
      await vscode.window.showWarningMessage("Unable to refresh, could not reach GitHub API");
    }
  }

  getTreeItem(element: WorkflowsTreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(element?: WorkflowsTreeNode | undefined): Promise<WorkflowsTreeNode[]> {
    if (!element) {
      logDebug("Getting root children");

      try {
        const gitHubContext = await getGitHubContext();
        if (!gitHubContext) {
          logDebug("could not get github context for workflows");
          return [new NoInternetConnectivityNode()];
        }

        if (gitHubContext.repos.length > 0) {
          // Special case, if there is only one repo, return workflow nodes directly
          if (gitHubContext.repos.length == 1) {
            return getWorkflowNodes(gitHubContext.repos[0]);
          }

          return gitHubContext.repos.map(r => new WorkflowsRepoNode(r));
        }

        log("No GitHub repositories found");
        return [];
      } catch (e) {
        logError(e as Error, "Failed to get GitHub context");

        if (`${(e as Error).message}`.startsWith("Could not get token from the GitHub authentication provider.")) {
          return [new AuthenticationNode()];
        }

        return [new ErrorNode(`An error has occurred: ${(e as Error).message}`)];
      }
    }

    if (element instanceof WorkflowsRepoNode) {
      return element.getWorkflows();
    } else if (element instanceof WorkflowNode) {
      return this.getRuns(element);
    } else if (element instanceof WorkflowRunNode) {
      return element.getJobs();
    } else if (element instanceof PreviousAttemptsNode) {
      return element.getAttempts();
    } else if (element instanceof AttemptNode) {
      return element.getJobs();
    } else if (element instanceof WorkflowJobNode) {
      return element.getSteps();
    }

    return [];
  }

  private async getRuns(wfNode: WorkflowNode): Promise<WorkflowRunNode[]> {
    logDebug("Getting workflow runs for workflow");

    const result = await wfNode.gitHubRepoContext.client.actions.listWorkflowRuns({
      owner: wfNode.gitHubRepoContext.owner,
      repo: wfNode.gitHubRepoContext.name,
      workflow_id: wfNode.wf.id
    });

    return this.runNodes(wfNode.gitHubRepoContext, result.data.workflow_runs);
  }
}
