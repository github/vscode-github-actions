import * as vscode from 'vscode'
import {getSession} from '../auth/auth'

export function registerSignIn(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('github-actions.sign-in', async () => {
      const session = await getSession(true)
      if (session) {
        await vscode.commands.executeCommand('setContext', 'github-actions.signed-in', true)
      }
    }),
  )
}
