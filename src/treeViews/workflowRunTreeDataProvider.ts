import {GitHubRepoContext} from '../git/repository'
import {WorkflowRun} from '../model'
import {RunStore} from '../store/store'
import {WorkflowRunNode} from './shared/workflowRunNode'

export abstract class WorkflowRunTreeDataProvider {
  protected _runNodes = new Map<number, WorkflowRunNode>()

  constructor(protected store: RunStore) {
    this.store.event(({run}) => {
      // Get tree node
      const node = this._runNodes.get(run.run.id)
      if (node) {
        node.updateRun(run)
        this._updateNode(node)
      }
    })
  }

  protected runNodes(
    gitHubRepoContext: GitHubRepoContext,
    runData: WorkflowRun[],
    includeWorkflowName = false,
  ): WorkflowRunNode[] {
    return runData.map(runData => {
      const workflowRun = this.store.addRun(gitHubRepoContext, runData)
      const node = new WorkflowRunNode(
        this.store,
        gitHubRepoContext,
        workflowRun,
        includeWorkflowName ? workflowRun.run.name || undefined : undefined,
      )
      this._runNodes.set(runData.id, node)
      return node
    })
  }

  protected abstract _updateNode(node: WorkflowRunNode): void
}
