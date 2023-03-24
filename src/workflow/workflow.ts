import * as vscode from 'vscode'

import {
  convertWorkflowTemplate,
  NoOperationTraceWriter,
  parseWorkflow,
  WorkflowTemplate,
} from '@actions/workflow-parser'
import {ErrorPolicy} from '@actions/workflow-parser/model/convert'
import {basename} from 'path'
import {GitHubRepoContext} from '../git/repository'

export async function getContextStringForWorkflow(workflowUri: vscode.Uri): Promise<string> {
  try {
    const content = await vscode.workspace.fs.readFile(workflowUri)
    const file = new TextDecoder().decode(content)

    const fileName = ''

    const result = parseWorkflow(
      {
        name: fileName,
        content: file,
      },
      new NoOperationTraceWriter(),
    )

    if (result.value) {
      const template = await convertWorkflowTemplate(result.context, result.value, undefined, {
        errorPolicy: ErrorPolicy.TryConversion,
      })

      const context: string[] = []

      if (template.events['repository_dispatch']) {
        context.push('rdispatch')
      }

      if (template.events['workflow_dispatch']) {
        context.push('wdispatch')
      }

      return context.join('')
    }
  } catch (e) {
    // Ignore
  }

  return ''
}

/**
 * Try to get Uri to workflow in currently open workspace folders
 *
 * @param path Path for workflow. E.g., `.github/workflows/somebuild.yaml`
 */
export function getWorkflowUri(gitHubRepoContext: GitHubRepoContext, path: string): vscode.Uri {
  return vscode.Uri.joinPath(gitHubRepoContext.workspaceUri, path)
}

export async function parseWorkflowFile(uri: vscode.Uri): Promise<WorkflowTemplate | undefined> {
  try {
    const b = await vscode.workspace.fs.readFile(uri)
    const workflowInput = new TextDecoder().decode(b)

    const fileName = basename(uri.fsPath)

    const result = parseWorkflow(
      {
        name: fileName,
        content: workflowInput,
      },
      new NoOperationTraceWriter(),
    )

    if (result.value) {
      return await convertWorkflowTemplate(result.context, result.value)
    }
  } catch {
    // Ignore error here
  }

  return undefined
}
