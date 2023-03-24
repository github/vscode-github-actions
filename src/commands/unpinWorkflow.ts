import * as vscode from 'vscode'

import {unpinWorkflow} from '../configuration/configuration'
import {GitHubRepoContext} from '../git/repository'
import {Workflow} from '../model'
import {getWorkflowUri} from '../workflow/workflow'

interface UnPinWorkflowCommandOptions {
  gitHubRepoContext: GitHubRepoContext
  wf?: Workflow

  updateContextValue(): void
}

export function registerUnPinWorkflow(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('github-actions.workflow.unpin', async (args: UnPinWorkflowCommandOptions) => {
      const {gitHubRepoContext, wf} = args

      if (!wf) {
        return
      }

      const workflowFullPath = getWorkflowUri(gitHubRepoContext, wf.path)
      if (!workflowFullPath) {
        return
      }

      const relativeWorkflowPath = vscode.workspace.asRelativePath(workflowFullPath)
      await unpinWorkflow(relativeWorkflowPath)

      args.updateContextValue()

      // Refresh tree to reflect updated `pin/unpin` icon
      await vscode.commands.executeCommand('github-actions.explorer.refresh')
    }),
  )
}
