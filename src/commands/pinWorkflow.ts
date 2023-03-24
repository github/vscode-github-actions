import * as vscode from 'vscode'

import {pinWorkflow} from '../configuration/configuration'
import {GitHubRepoContext} from '../git/repository'
import {Workflow} from '../model'
import {getWorkflowUri} from '../workflow/workflow'

interface PinWorkflowCommandOptions {
  gitHubRepoContext: GitHubRepoContext
  wf?: Workflow

  updateContextValue(): void
}

export function registerPinWorkflow(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('github-actions.workflow.pin', async (args: PinWorkflowCommandOptions) => {
      const {gitHubRepoContext, wf} = args

      if (!wf) {
        return
      }

      const workflowFullPath = getWorkflowUri(gitHubRepoContext, wf.path)
      if (!workflowFullPath) {
        return
      }

      const relativeWorkflowPath = vscode.workspace.asRelativePath(workflowFullPath)
      await pinWorkflow(relativeWorkflowPath)

      args.updateContextValue()

      // Refresh tree to reflect updated `pin/unpin` icon
      await vscode.commands.executeCommand('github-actions.explorer.refresh')
    }),
  )
}
