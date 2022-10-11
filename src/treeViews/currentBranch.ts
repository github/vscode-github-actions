import * as vscode from "vscode";

import { CurrentBranchRepoNode, getCurrentBranchWorkflowRunNodes } from "./current-branch/currentBranchRepoNode";
import { getCurrentBranch, getGitHubContext } from "../git/repository";

import { NoRunForBranchNode } from "./current-branch/noRunForBranchNode";
import { WorkflowJobNode } from "./workflows/workflowJobNode";
import { WorkflowRunNode } from "./workflows/workflowRunNode";
import { WorkflowStepNode } from "./workflows/workflowStepNode";
import { logDebug } from "../log";

type CurrentBranchTreeNode =
  | CurrentBranchRepoNode
  | WorkflowRunNode
  | WorkflowJobNode
  | WorkflowStepNode
  | NoRunForBranchNode;

export class CurrentBranchTreeProvider implements vscode.TreeDataProvider<CurrentBranchTreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<CurrentBranchTreeNode | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: CurrentBranchTreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(element?: CurrentBranchTreeNode | undefined): Promise<CurrentBranchTreeNode[]> {
    if (!element) {
      const gitHubContext = await getGitHubContext();
      if (!gitHubContext) {
        return [];
      }

      if (gitHubContext.repos.length === 1) {
        return (await getCurrentBranchWorkflowRunNodes(gitHubContext.repos[0])) || [];
      }

      if (gitHubContext.repos.length > 1) {
        return gitHubContext.repos
          .map((repoContext): CurrentBranchRepoNode | undefined => {
            const currentBranch = getCurrentBranch(repoContext.repositoryState);
            if (!currentBranch) {
              logDebug(`Could not find current branch for ${repoContext.name}`);
              return undefined;
            }

            return new CurrentBranchRepoNode(repoContext, currentBranch);
          })
          .filter((x) => x !== undefined) as CurrentBranchRepoNode[];
      }
    } else if (element instanceof CurrentBranchRepoNode) {
      return element.getRuns();
    } else if (element instanceof WorkflowRunNode) {
      return element.getJobs();
    } else if (element instanceof WorkflowJobNode) {
      return element.getSteps();
    }

    return [];
  }
}
