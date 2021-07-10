import * as vscode from "vscode";
import { getGitHubContext } from "../git/repository";
import { AuthenticationNode } from "./shared/authenticationNode";
import { ErrorNode } from "./shared/errorNode";
import { NoGitHubRepositoryNode } from "./shared/noGitHubRepositoryNode";
import { WorkflowJobNode } from "./workflows/workflowJobNode";
import { WorkflowNode } from "./workflows/workflowNode";
import { WorkflowRunNode } from "./workflows/workflowRunNode";
import { WorkflowsRepoNode } from "./workflows/workflowsRepoNode";
import { WorkflowStepNode } from "./workflows/workflowStepNode";

type WorkflowsTreeNode =
  | AuthenticationNode
  | NoGitHubRepositoryNode
  | WorkflowNode
  | WorkflowRunNode
  | WorkflowStepNode;

export class WorkflowsTreeProvider
  implements vscode.TreeDataProvider<WorkflowsTreeNode>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<WorkflowsTreeNode | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(
    element: WorkflowsTreeNode
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(
    element?: WorkflowsTreeNode | undefined
  ): Promise<WorkflowsTreeNode[]> {
    if (!element) {
      try {
        const gitHubContext = await getGitHubContext();
        if (!gitHubContext) {
          return [];
        }

        if (gitHubContext.repos.length > 0) {
          return gitHubContext.repos.map((r) => new WorkflowsRepoNode(r));
        }
      } catch (e) {
        if (
          `${e?.message}`.startsWith(
            "Could not get token from the GitHub authentication provider."
          )
        ) {
          return [new AuthenticationNode()];
        }

        return [new ErrorNode(`An error has occured: ${e.message}`)];
      }
    }

    if (element instanceof WorkflowsRepoNode) {
      return element.getWorkflows();
    } else if (element instanceof WorkflowNode) {
      return element.getRuns();
    } else if (element instanceof WorkflowRunNode) {
      return element.getJobs();
    } else if (element instanceof WorkflowJobNode) {
      return element.getSteps();
    }

    return [];
  }
}
