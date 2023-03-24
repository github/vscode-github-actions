import * as vscode from 'vscode'
import {VariableCommandArgs} from '../../treeViews/settings/variableNode'

export function registerUpdateVariable(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('github-actions.settings.variable.update', async (args: VariableCommandArgs) => {
      const {gitHubRepoContext, variable, environment} = args

      const name = await vscode.window.showInputBox({
        prompt: 'Enter the new variable name',
        value: variable.name,
      })

      const value = await vscode.window.showInputBox({
        prompt: 'Enter the new variable value',
        value: variable.value,
      })

      if (name == variable.name && value == variable.value) {
        return
      }

      const payload: {name?: string; value?: string} = {}
      if (name != variable.name) {
        payload.name = name
      }
      if (value != variable.value) {
        payload.value = value
      }

      try {
        if (environment) {
          await gitHubRepoContext.client.request(
            `PATCH /repositories/${gitHubRepoContext.id}/environments/${environment.name}/variables/${variable.name}`,
            payload,
          )
        } else {
          await gitHubRepoContext.client.request(
            `PATCH /repos/${gitHubRepoContext.owner}/${gitHubRepoContext.name}/actions/variables/${variable.name}`,
            payload,
          )
        }
      } catch (e) {
        await vscode.window.showErrorMessage((e as Error).message)
      }

      await vscode.commands.executeCommand('github-actions.explorer.refresh')
    }),
  )
}
