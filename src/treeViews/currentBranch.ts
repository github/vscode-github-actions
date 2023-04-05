import * as vscode from "vscode";

import {canReachGitHubAPI} from "../api/canReachGitHubAPI";
import {getCurrentBranch, getGitHubContext, GitHubRepoContext} from "../git/repository";
import {CurrentBranchRepoNode} from "./current-branch/currentBranchRepoNode";

import {NoRunForBranchNode} from "./current-branch/noRunForBranchNode";
import {log, logDebug} from "../log";
import {RunStore} from "../store/store";
import {AttemptNode} from "./shared/attemptNode";
import {GitHubAPIUnreachableNode} from "./shared/gitHubApiUnreachableNode";
import {NoWorkflowJobsNode} from "./shared/noWorkflowJobsNode";
import {PreviousAttemptsNode} from "./shared/previousAttemptsNode";
import {WorkflowJobNode} from "./shared/workflowJobNode";
import {WorkflowRunNode} from "./shared/workflowRunNode";
import {WorkflowRunTreeDataProvider} from "./workflowRunTreeDataProvider";
import {WorkflowStepNode} from "./workflows/workflowStepNode";

type CurrentBranchTreeNode =
  | CurrentBranchRepoNode
  | WorkflowRunNode
  | PreviousAttemptsNode
  | AttemptNode
  | WorkflowJobNode
  | NoWorkflowJobsNode
  | WorkflowStepNode
  | NoRunForBranchNode
  | GitHubAPIUnreachableNode;

export class CurrentBranchTreeProvider
  extends WorkflowRunTreeDataProvider
  implements vscode.TreeDataProvider<CurrentBranchTreeNode>
{
  protected _onDidChangeTreeData = new vscode.EventEmitter<CurrentBranchTreeNode | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(store: RunStore) {
    super(store);
  }

  protected _updateNode(node: WorkflowRunNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  async refresh(): Promise<void> {
    // Don't delete all the nodes if we can't reach GitHub API
    if (await canReachGitHubAPI()) {
      this._onDidChangeTreeData.fire(null);
    } else {
      await vscode.window.showWarningMessage("Unable to refresh, could not reach GitHub API");
    }
  }

  getTreeItem(element: CurrentBranchTreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(element?: CurrentBranchTreeNode | undefined): Promise<CurrentBranchTreeNode[]> {
    if (!element) {
      const gitHubContext = await getGitHubContext();
      if (!gitHubContext) {
        return [new GitHubAPIUnreachableNode()];
      }

      if (gitHubContext.repos.length === 1) {
        const repoContext = gitHubContext.repos[0];
        const currentBranch = getCurrentBranch(repoContext.repositoryState);
        if (!currentBranch) {
          log(`Could not find current branch for ${repoContext.name}`);
          return [];
        }

        return (await this.getRuns(repoContext, currentBranch)) || [];
      }

      if (gitHubContext.repos.length > 1) {
        return gitHubContext.repos
          .map((repoContext): CurrentBranchRepoNode | undefined => {
            const currentBranch = getCurrentBranch(repoContext.repositoryState);
            if (!currentBranch) {
              log(`Could not find current branch for ${repoContext.name}`);
              return undefined;
            }

            return new CurrentBranchRepoNode(repoContext, currentBranch);
          })
          .filter(x => x !== undefined) as CurrentBranchRepoNode[];
      }
    } else if (element instanceof CurrentBranchRepoNode) {
      return this.getRuns(element.gitHubRepoContext, element.currentBranchName);
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

  private async getRuns(gitHubRepoContext: GitHubRepoContext, currentBranchName: string): Promise<WorkflowRunNode[]> {
    logDebug("Getting workflow runs for branch");

    const result = await gitHubRepoContext.client.actions.listWorkflowRunsForRepo({
      owner: gitHubRepoContext.owner,
      repo: gitHubRepoContext.name,
      branch: currentBranchName
    });

    const resp = result.data;
    const runs = resp.workflow_runs;
    // We are removing newlines from workflow names for presentation purposes
    const runsWithNamesWithNoNewlines = runs.map(run => {
      if (run.name) {
        run.name = run.name.replace(/(\r\n|\n|\r)/gm, " ");
      }

      return run;
    });

    return this.runNodes(gitHubRepoContext, runsWithNamesWithNoNewlines, true);
  }
}
