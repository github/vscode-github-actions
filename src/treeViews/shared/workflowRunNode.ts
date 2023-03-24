import * as vscode from 'vscode'

import {GitHubRepoContext} from '../../git/repository'
import {RunStore} from '../../store/store'
import {WorkflowRun} from '../../store/workflowRun'
import {getIconForWorkflowRun} from '../icons'
import {getEventString, getStatusString} from './runTooltipHelper'
import {NoWorkflowJobsNode} from './noWorkflowJobsNode'
import {PreviousAttemptsNode} from './previousAttemptsNode'
import {WorkflowJobNode} from './workflowJobNode'

export type WorkflowRunCommandArgs = Pick<WorkflowRunNode, 'gitHubRepoContext' | 'run' | 'store'>

export class WorkflowRunNode extends vscode.TreeItem {
  constructor(
    public readonly store: RunStore,
    public readonly gitHubRepoContext: GitHubRepoContext,
    public run: WorkflowRun,
    public readonly workflowName?: string,
  ) {
    super(WorkflowRunNode._getLabel(run, workflowName), vscode.TreeItemCollapsibleState.Collapsed)

    this.updateRun(run)
  }

  updateRun(run: WorkflowRun) {
    this.run = run
    this.label = WorkflowRunNode._getLabel(run, this.workflowName)

    this.contextValue = this.run.contextValue(this.gitHubRepoContext.permissionLevel)

    this.iconPath = getIconForWorkflowRun(this.run.run)
    this.tooltip = this.getTooltip()
  }

  async getJobs(): Promise<(WorkflowJobNode | NoWorkflowJobsNode | PreviousAttemptsNode)[]> {
    const jobs = await this.run.jobs()

    const children: (WorkflowJobNode | NoWorkflowJobsNode | PreviousAttemptsNode)[] = jobs.map(
      job => new WorkflowJobNode(this.gitHubRepoContext, job),
    )

    if (this.run.hasPreviousAttempts) {
      children.push(new PreviousAttemptsNode(this.gitHubRepoContext, this.run))
    }

    return children
  }

  getTooltip(): vscode.MarkdownString {
    let markdownString = ''

    if (this.run.hasPreviousAttempts && this.run.run.run_attempt) {
      markdownString += `Attempt #${this.run.run.run_attempt} `
    }

    markdownString += getStatusString(this.run, markdownString.length == 0)
    markdownString += `\n\n`
    markdownString += getEventString(this.run)

    return new vscode.MarkdownString(markdownString)
  }

  private static _getLabel(run: WorkflowRun, workflowName?: string): string {
    return `${workflowName ? workflowName + ' ' : ''}#${run.run.run_number}`
  }
}
