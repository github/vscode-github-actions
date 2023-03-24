import * as vscode from 'vscode'
import {VariableCommandArgs} from '../../treeViews/settings/variableNode'

export function registerCopyVariable(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('github-actions.settings.variable.copy-name', async (args: VariableCommandArgs) => {
      const {variable} = args

      await vscode.env.clipboard.writeText(variable.name)

      vscode.window.setStatusBarMessage(`Copied ${variable.name}`, 2000)
    }),
    vscode.commands.registerCommand(
      'github-actions.settings.variable.copy-value',
      async (args: VariableCommandArgs) => {
        const {variable} = args

        await vscode.env.clipboard.writeText(variable.value)

        vscode.window.setStatusBarMessage(`Copied ${variable.value}`, 2000)
      },
    ),
  )
}
