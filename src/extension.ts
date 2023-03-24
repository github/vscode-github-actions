import * as vscode from 'vscode'

import {canReachGitHubAPI} from './api/canReachGitHubAPI'
import {getSession} from './auth/auth'
import {registerCancelWorkflowRun} from './commands/cancelWorkflowRun'
import {registerOpenWorkflowFile} from './commands/openWorkflowFile'
import {registerOpenWorkflowJobLogs} from './commands/openWorkflowJobLogs'
import {registerOpenWorkflowRun} from './commands/openWorkflowRun'
import {registerPinWorkflow} from './commands/pinWorkflow'
import {registerReRunWorkflowRun} from './commands/rerunWorkflowRun'
import {registerAddSecret} from './commands/secrets/addSecret'
import {registerCopySecret} from './commands/secrets/copySecret'
import {registerDeleteSecret} from './commands/secrets/deleteSecret'
import {registerUpdateSecret} from './commands/secrets/updateSecret'
import {registerTriggerWorkflowRun} from './commands/triggerWorkflowRun'
import {registerUnPinWorkflow} from './commands/unpinWorkflow'
import {registerAddVariable} from './commands/variables/addVariable'
import {registerCopyVariable} from './commands/variables/copyVariable'
import {registerDeleteVariable} from './commands/variables/deleteVariable'
import {registerUpdateVariable} from './commands/variables/updateVariable'
import {initConfiguration} from './configuration/configuration'
import {getGitHubContext} from './git/repository'
import {init as initLogger, log, revealLog} from './log'
import {LogScheme} from './logs/constants'
import {WorkflowStepLogProvider} from './logs/fileProvider'
import {WorkflowStepLogFoldingProvider} from './logs/foldingProvider'
import {WorkflowStepLogSymbolProvider} from './logs/symbolProvider'
import {initPinnedWorkflows} from './pinnedWorkflows/pinnedWorkflows'
import {RunStore} from './store/store'
import {initWorkflowDocumentTracking} from './tracker/workflowDocumentTracker'
import {initWorkspaceChangeTracker} from './tracker/workspaceTracker'
import {initResources} from './treeViews/icons'
import {initTreeViews} from './treeViews/treeViews'
import {deactivateLanguageServer, initLanguageServer} from './workflow/languageServer'
import {registerSignIn} from './commands/signIn'

export async function activate(context: vscode.ExtensionContext) {
  initLogger()

  log('Activating GitHub Actions extension...')

  const hasSession = !!(await getSession())
  const canReachAPI = hasSession && (await canReachGitHubAPI())

  // Prefetch git repository origin url
  const ghContext = hasSession && (await getGitHubContext())
  const hasGitHubRepos = ghContext && ghContext.repos.length > 0

  await Promise.all([
    vscode.commands.executeCommand('setContext', 'github-actions.signed-in', hasSession),
    vscode.commands.executeCommand('setContext', 'github-actions.internet-access', canReachAPI),
    vscode.commands.executeCommand('setContext', 'github-actions.has-repos', hasGitHubRepos),
  ])

  initResources(context)
  initConfiguration(context)

  // Track workflow documents and workspace changes
  initWorkspaceChangeTracker(context)
  await initWorkflowDocumentTracking(context)

  const store = new RunStore()

  // Pinned workflows
  await initPinnedWorkflows(store)

  // Tree views
  await initTreeViews(context, store)

  // Commands
  registerOpenWorkflowRun(context)
  registerOpenWorkflowFile(context)
  registerOpenWorkflowJobLogs(context)
  registerTriggerWorkflowRun(context)
  registerReRunWorkflowRun(context)
  registerCancelWorkflowRun(context)

  registerAddSecret(context)
  registerDeleteSecret(context)
  registerCopySecret(context)
  registerUpdateSecret(context)

  registerAddVariable(context)
  registerUpdateVariable(context)
  registerDeleteVariable(context)
  registerCopyVariable(context)

  registerPinWorkflow(context)
  registerUnPinWorkflow(context)

  registerSignIn(context)

  // Log providers
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(LogScheme, new WorkflowStepLogProvider()),
  )

  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider({scheme: LogScheme}, new WorkflowStepLogFoldingProvider()),
  )

  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      {
        scheme: LogScheme,
      },
      new WorkflowStepLogSymbolProvider(),
    ),
  )

  // Editing features
  await initLanguageServer(context)

  log('...initialized')

  if (!PRODUCTION) {
    // In debugging mode, always open the log for the extension in the `Output` window
    revealLog()
  }
}

export function deactivate(): Thenable<void> | undefined {
  return deactivateLanguageServer()
}
