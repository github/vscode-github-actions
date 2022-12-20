import * as vscode from "vscode";

import {
  getPinnedWorkflows,
  isPinnedWorkflowsRefreshEnabled,
  onPinnedWorkflowsChange,
  pinnedWorkflowsRefreshInterval
} from "../configuration/configuration";
import {getGitHubContextForWorkspaceUri, GitHubRepoContext} from "../git/repository";

import {sep} from "path";
import {logError} from "../log";
import {Workflow, WorkflowRun} from "../model";
import {RunStore} from "../store/store";
import {getCodIconForWorkflowrun} from "../treeViews/icons";

interface PinnedWorkflow {
  /** Displayed name */
  workflowName: string;

  workflowId: number;

  lastRunId: number | undefined;

  gitHubRepoContext: GitHubRepoContext;

  /** Status bar item created for this workflow */
  statusBarItem: vscode.StatusBarItem;
}

const pinnedWorkflows: PinnedWorkflow[] = [];
let refreshTimer: NodeJS.Timeout | undefined;
let runStore: RunStore;

export async function initPinnedWorkflows(store: RunStore) {
  // Register handler for configuration changes
  onPinnedWorkflowsChange(() => void _init());

  runStore = store;
  runStore.event(({run}) => {
    // Are we listening to this run?
    const workflowId = run.run.workflow_id;
    for (const pinnedWorkflow of pinnedWorkflows) {
      if (pinnedWorkflow.workflowId === workflowId && pinnedWorkflow.lastRunId === run.run.id) {
        updatePinnedWorkflow(pinnedWorkflow, run.run);
        break;
      }
    }
  });

  await _init();
}

async function _init(): Promise<void> {
  await updatePinnedWorkflows();

  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }

  if (isPinnedWorkflowsRefreshEnabled()) {
    refreshTimer = setInterval(() => void refreshPinnedWorkflows(), pinnedWorkflowsRefreshInterval() * 1000);
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
    if (pinnedWorkflow.startsWith(".github/")) {
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

    const workflowByPath: {[id: string]: Workflow} = {};
    workflows.data.workflows.forEach(w => (workflowByPath[w.path] = w));

    for (const pinnedWorkflow of workflowsByWorkspace.get(workspaceName) || []) {
      const pW = createPinnedWorkflow(gitHubRepoContext, workflowByPath[pinnedWorkflow]);
      await refreshPinnedWorkflow(pW);
    }
  }
}

async function refreshPinnedWorkflows() {
  for (const pinnedWorkflow of pinnedWorkflows) {
    await refreshPinnedWorkflow(pinnedWorkflow);
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

function createPinnedWorkflow(gitHubRepoContext: GitHubRepoContext, workflow: Workflow): PinnedWorkflow {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

  const pinnedWorkflow = {
    gitHubRepoContext,
    workflowId: workflow.id,
    workflowName: workflow.name,
    lastRunId: undefined,
    statusBarItem
  };

  pinnedWorkflows.push(pinnedWorkflow);

  return pinnedWorkflow;
}

async function refreshPinnedWorkflow(pinnedWorkflow: PinnedWorkflow) {
  const {gitHubRepoContext} = pinnedWorkflow;

  try {
    const runs = await gitHubRepoContext.client.actions.listWorkflowRuns({
      owner: gitHubRepoContext.owner,
      repo: gitHubRepoContext.name,
      workflow_id: pinnedWorkflow.workflowId, // Workflow can also be a file name
      per_page: 1
    });
    const {workflow_runs} = runs.data;

    // Add all runs to store
    for (const run of workflow_runs) {
      runStore.addRun(gitHubRepoContext, run);
    }

    const mostRecentRun = workflow_runs?.[0];

    updatePinnedWorkflow(pinnedWorkflow, mostRecentRun);
  } catch (e) {
    logError(e as Error, "Error updating pinned workflow");
  }
}

function updatePinnedWorkflow(pinnedWorkflow: PinnedWorkflow, run: WorkflowRun | undefined) {
  if (!run) {
    // Workflow has never run, set default text
    pinnedWorkflow.statusBarItem.text = `$(${getCodIconForWorkflowrun()}) ${pinnedWorkflow.workflowName}`;

    // Can't do anything without a run
    pinnedWorkflow.statusBarItem.command = undefined;
  } else {
    pinnedWorkflow.statusBarItem.text = `$(${getCodIconForWorkflowrun(run)}) ${pinnedWorkflow.workflowName}`;

    if (run.conclusion === "failure") {
      pinnedWorkflow.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    } else {
      pinnedWorkflow.statusBarItem.backgroundColor = undefined;
    }

    pinnedWorkflow.statusBarItem.command = {
      title: "Open workflow run",
      command: "github-actions.workflow.run.open",
      arguments: [
        {
          run: run
        }
      ]
    };
  }

  pinnedWorkflow.lastRunId = run?.id;

  // Ensure the status bar item is visible
  pinnedWorkflow.statusBarItem.show();
}
