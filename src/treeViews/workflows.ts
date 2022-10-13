import * as vscode from 'vscode';

import {WorkflowsRepoNode, getWorkflowNodes} from './workflows/workflowsRepoNode';
import {log, logDebug, logError} from '../log';

import {AuthenticationNode} from './shared/authenticationNode';
import {ErrorNode} from './shared/errorNode';
import {NoGitHubRepositoryNode} from './shared/noGitHubRepositoryNode';
import {WorkflowJobNode} from './workflows/workflowJobNode';
import {WorkflowNode} from './workflows/workflowNode';
import {WorkflowRunNode} from './workflows/workflowRunNode';
import {WorkflowStepNode} from './workflows/workflowStepNode';
import {getGitHubContext} from '../git/repository';

type WorkflowsTreeNode =
  | AuthenticationNode
  | NoGitHubRepositoryNode
  | WorkflowNode
  | WorkflowJobNode
  | WorkflowRunNode
  | WorkflowStepNode;

export class WorkflowsTreeProvider implements vscode.TreeDataProvider<WorkflowsTreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<WorkflowsTreeNode | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    logDebug('Refreshing workflow tree');
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: WorkflowsTreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(element?: WorkflowsTreeNode | undefined): Promise<WorkflowsTreeNode[]> {
    logDebug('Getting root children');

    if (!element) {
      try {
        const gitHubContext = await getGitHubContext();
        if (!gitHubContext) {
          logDebug('could not get github context');
          return [];
        }

        if (gitHubContext.repos.length > 0) {
          if (gitHubContext.repos.length == 1) {
            return getWorkflowNodes(gitHubContext.repos[0]);
          }

          return gitHubContext.repos.map(r => new WorkflowsRepoNode(r));
        }

        log('No GitHub repositories found');
        return [];
      } catch (e) {
        logError(e as Error, 'Failed to get GitHub context');

        if (`${(e as Error).message}`.startsWith('Could not get token from the GitHub authentication provider.')) {
          return [new AuthenticationNode()];
        }

        return [new ErrorNode(`An error has occured: ${(e as Error).message}`)];
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
