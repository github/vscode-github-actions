import * as vscode from "vscode";

import {canReachGitHubAPI} from "../api/canReachGitHubAPI";
import {getGitHubContext} from "../git/repository";
import {logError} from "../log";
import {RunStore} from "../store/store";
import {AutoRefreshManager} from "./combinedWorkflows/autoRefreshManager";
import {CombinedWorkflowRunNode} from "./combinedWorkflows/combinedWorkflowRunNode";
import {AttemptNode} from "./shared/attemptNode";
import {AuthenticationNode} from "./shared/authenticationNode";
import {ErrorNode} from "./shared/errorNode";
import {GitHubAPIUnreachableNode} from "./shared/gitHubApiUnreachableNode";
import {NoWorkflowJobsNode} from "./shared/noWorkflowJobsNode";
import {PreviousAttemptsNode} from "./shared/previousAttemptsNode";
import {WorkflowJobNode} from "./shared/workflowJobNode";
import {WorkflowRunNode} from "./shared/workflowRunNode";
import {WorkflowRunTreeDataProvider} from "./workflowRunTreeDataProvider";

type CombinedWorkflowsTreeNode =
  | AuthenticationNode
  | WorkflowRunNode
  | PreviousAttemptsNode
  | AttemptNode
  | WorkflowJobNode
  | NoWorkflowJobsNode
  | GitHubAPIUnreachableNode;

export class CombinedWorkflowsTreeProvider
  extends WorkflowRunTreeDataProvider
  implements vscode.TreeDataProvider<CombinedWorkflowsTreeNode>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<CombinedWorkflowsTreeNode | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private autoRefreshManager: AutoRefreshManager;
  private treeView?: vscode.TreeView<CombinedWorkflowsTreeNode>;

  constructor(store: RunStore) {
    super(store);
    this.autoRefreshManager = new AutoRefreshManager(
      () => this.refresh(),
      (description: string) => this.updateViewDescription(description)
    );
  }

  setTreeView(treeView: vscode.TreeView<CombinedWorkflowsTreeNode>): void {
    this.treeView = treeView;
    this.updateViewDescription(this.autoRefreshManager.getDescription());
    this.updateAutoRefreshContext();
  }

  private updateViewDescription(description: string): void {
    if (this.treeView) {
      this.treeView.description = description;
    }
    this.updateAutoRefreshContext();
  }

  private updateAutoRefreshContext(): void {
    const isActive = this.autoRefreshManager.isActive();
    void vscode.commands.executeCommand("setContext", "github-actions.combined-workflows.auto-refresh-active", isActive);
  }

  protected _updateNode(node: WorkflowRunNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  async refresh(): Promise<void> {
    if (await canReachGitHubAPI()) {
      this._onDidChangeTreeData.fire(null);
    } else {
      await vscode.window.showWarningMessage("Unable to refresh, could not reach GitHub API");
    }
  }

  setVisible(visible: boolean): void {
    this.autoRefreshManager.setVisible(visible);
  }

  onPush(): void {
    this.autoRefreshManager.onPush();
  }

  getAutoRefreshManager(): AutoRefreshManager {
    return this.autoRefreshManager;
  }

  dispose(): void {
    this.autoRefreshManager.dispose();
  }

  getTreeItem(element: CombinedWorkflowsTreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(element?: CombinedWorkflowsTreeNode | undefined): Promise<CombinedWorkflowsTreeNode[]> {
    if (!element) {
      try {
        const gitHubContext = await getGitHubContext();
        if (!gitHubContext) {
          return [new GitHubAPIUnreachableNode()];
        }

        if (gitHubContext.repos.length === 0) {
          return [];
        }

        const allRuns: CombinedWorkflowRunNode[] = [];

        for (const repo of gitHubContext.repos) {
          try {
            const result = await repo.client.actions.listWorkflowRunsForRepo({
              owner: repo.owner,
              repo: repo.name,
              per_page: 20
            });

            const runs = result.data.workflow_runs.map(runData => {
              const workflowRun = this.store.addRun(repo, runData);
              const node = new CombinedWorkflowRunNode(
                this.store,
                repo,
                workflowRun,
                workflowRun.run.name || undefined
              );
              this._runNodes.set(runData.id, node);
              return node;
            });
            allRuns.push(...runs);
          } catch (e) {
            logError(e as Error, `Failed to fetch runs for ${repo.owner}/${repo.name}`);
          }
        }

        allRuns.sort((a, b) => {
          const aTime = new Date(a.run.run.created_at).getTime();
          const bTime = new Date(b.run.run.created_at).getTime();
          return bTime - aTime;
        });

        return allRuns;
      } catch (e) {
        logError(e as Error, (e as Error).message);

        if ((e as Error).message.startsWith("Could not get token from the GitHub authentication provider.")) {
          return [new AuthenticationNode()];
        }

        return [new ErrorNode(`An error has occurred: ${(e as Error).message}`)];
      }
    }

    if (element instanceof WorkflowRunNode) {
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
}
