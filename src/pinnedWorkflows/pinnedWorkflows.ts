import * as vscode from 'vscode';

import {GitHubRepoContext, getGitHubContextForWorkspaceUri} from '../git/repository';
import {
  getPinnedWorkflows,
  isPinnedWorkflowsRefreshEnabled,
  onPinnedWorkflowsChange,
  pinnedWorkflowsRefreshInterval
} from '../configuration/configuration';

import {WorkflowRun} from '../model';
import {getCodIconForWorkflowrun} from '../treeViews/icons';
import {sep} from 'path';

interface PinnedWorkflow {
  /** Displayed name */
  workflowName: string;

  workflowId: string;

  gitHubRepoContext: GitHubRepoContext;

  /** Status bar item created for this workflow */
  statusBarItem: vscode.StatusBarItem;
}

const pinnedWorkflows: PinnedWorkflow[] = [];
let refreshTimer: NodeJS.Timeout | undefined;

export async function initPinnedWorkflows() {
  // Register handler for configuration changes
  onPinnedWorkflowsChange(() => _init);

  await _init();
}

async function _init() {
  await updatePinnedWorkflows();

  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
  if (isPinnedWorkflowsRefreshEnabled()) {
    refreshTimer = setInterval(() => refreshPinnedWorkflows, pinnedWorkflowsRefreshInterval() * 1000);
  }
}

async function updatePinnedWorkflows() {
  clearPinnedWorkflows();
  const pinnedWorkflows = getPinnedWorkflows();

  // Assume we have a folder open. Without a folder open, we can't do anything
  if (!vscode.workspace.workspaceFolders?.length) {
    return;
  }

  const firstWorkspaceFolderName = vscode.workspace.workspaceFolders[0].name;

  const workflowsByWorkspace = new Map<string, string[]>();

  for (const pinnedWorkflow of pinnedWorkflows) {
    const workflowPath = pinnedWorkflow;
    if (pinnedWorkflow.startsWith('.github/')) {
      // No workspace, attribute to the first workspace folder
      workflowsByWorkspace.set(firstWorkspaceFolderName, [
        pinnedWorkflow,
        ...(workflowsByWorkspace.get(firstWorkspaceFolderName) || [])
      ]);
    } else {
      const [workSpaceName, ...r] = workflowPath.split(sep);
      workflowsByWorkspace.set(workSpaceName, [r.join(sep), ...(workflowsByWorkspace.get(workSpaceName) || [])]);
    }
  }

  for (const workspaceName of workflowsByWorkspace.keys()) {
    const workspace = vscode.workspace.workspaceFolders?.find(x => x.name === workspaceName);
    if (!workspace) {
      continue;
    }

    const gitHubRepoContext = await getGitHubContextForWorkspaceUri(workspace.uri);
    if (!gitHubRepoContext) {
      return;
    }

    // Get all workflows to resolve names. We could do this locally, but for now, let's make the API call.
    const workflows = await gitHubRepoContext.client.actions.listRepoWorkflows({
      owner: gitHubRepoContext.owner,
      repo: gitHubRepoContext.name
    });
    const workflowNameByPath: {[id: string]: string} = {};
    workflows.data.workflows.forEach(w => (workflowNameByPath[w.path] = w.name));
    for (const pinnedWorkflow of workflowsByWorkspace.get(workspaceName) || []) {
      const pW = createPinnedWorkflow(gitHubRepoContext, pinnedWorkflow, workflowNameByPath[pinnedWorkflow]);
      await updatePinnedWorkflow(pW);
    }
  }
}

async function refreshPinnedWorkflows() {
  for (const pinnedWorkflow of pinnedWorkflows) {
    await updatePinnedWorkflow(pinnedWorkflow);
  }
}

function clearPinnedWorkflows() {
  // Remove any existing pinned workflows
  for (const pinnedWorkflow of pinnedWorkflows) {
    pinnedWorkflow.statusBarItem.hide();
    pinnedWorkflow.statusBarItem.dispose();
  }

  pinnedWorkflows.splice(0, pinnedWorkflows.length);
}

function createPinnedWorkflow(gitHubRepoContext: GitHubRepoContext, id: string, name: string): PinnedWorkflow {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

  const pinnedWorkflow = {
    gitHubRepoContext,
    workflowId: id,
    workflowName: name,
    statusBarItem
  };

  pinnedWorkflows.push(pinnedWorkflow);

  return pinnedWorkflow;
}

async function updatePinnedWorkflow(pinnedWorkflow: PinnedWorkflow) {
  const {gitHubRepoContext} = pinnedWorkflow;

  try {
    const runs = await gitHubRepoContext.client.actions.listWorkflowRuns({
      owner: gitHubRepoContext.owner,
      repo: gitHubRepoContext.name,
      workflow_id: pinnedWorkflow.workflowId, // Workflow can also be a file name
      per_page: 1
    });
    const {total_count, workflow_runs} = runs.data;
    if (total_count == 0) {
      // Workflow has never run, set default text
      pinnedWorkflow.statusBarItem.text = `$(${getCodIconForWorkflowrun()}) ${pinnedWorkflow.workflowName}`;
      // Can't do anything without a run
      pinnedWorkflow.statusBarItem.command = undefined;
    }
    const mostRecentRun = workflow_runs[0] as WorkflowRun;
    pinnedWorkflow.statusBarItem.text = `$(${getCodIconForWorkflowrun(mostRecentRun)}) ${pinnedWorkflow.workflowName}`;
    if (mostRecentRun.conclusion === 'failure') {
      pinnedWorkflow.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else {
      pinnedWorkflow.statusBarItem.backgroundColor = undefined;
    }
    pinnedWorkflow.statusBarItem.command = {
      title: 'Open workflow run',
      command: 'github-actions.workflow.run.open',
      arguments: [
        {
          run: mostRecentRun
        }
      ]
    };
    // TODO: Do we need to hide before?
    pinnedWorkflow.statusBarItem.show();
  } catch {
    // TODO: Display error
  }
}
