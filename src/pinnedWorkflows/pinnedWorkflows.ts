import * as vscode from "vscode";

import { GitHubContext, getGitHubContext } from "../git/repository";
import {
  getPinnedWorkflows,
  isPinnedWorkflowsRefreshEnabled,
  onPinnedWorkflowsChange,
  pinnedWorkflowsRefreshInterval,
} from "../configuration/configuration";

import { WorkflowRun } from "../model";
import { getCodIconForWorkflowrun } from "../treeViews/icons";

interface PinnedWorkflow {
  /** Displayed name */
  workflowName: string;

  workflowId: string;

  /** Status bar item created for this workflow */
  statusBarItem: vscode.StatusBarItem;
}

const pinnedWorkflows: PinnedWorkflow[] = [];
let refreshTimer: NodeJS.Timeout | undefined;

export async function initPinnedWorkflows(context: vscode.ExtensionContext) {
  // Register handler for configuration changes
  onPinnedWorkflowsChange(_init);

  await _init();
}

async function _init() {
  await updatePinnedWorkflows();

  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
  if (isPinnedWorkflowsRefreshEnabled()) {
    refreshTimer = setInterval(
      refreshPinnedWorkflows,
      pinnedWorkflowsRefreshInterval() * 1000
    );
  }
}

async function updatePinnedWorkflows() {
  clearPinnedWorkflows();

  const pinnedWorkflows = getPinnedWorkflows();
  if (!pinnedWorkflows || pinnedWorkflows.length == 0) {
    return;
  }

  const gitHubContext = await getGitHubContext();
  if (!gitHubContext) {
    return;
  }

  // Get all workflows to resolve names. We could do this locally, but for now, let's make the API call.
  const workflows = await gitHubContext.client.actions.listRepoWorkflows({
    owner: gitHubContext.owner,
    repo: gitHubContext.name,
  });
  const workflowNameByPath: { [id: string]: string } = {};
  workflows.data.workflows.forEach(
    (w) => (workflowNameByPath[w.path] = w.name)
  );

  for (const pinnedWorkflow of pinnedWorkflows) {
    const pW = createPinnedWorkflow(
      pinnedWorkflow,
      workflowNameByPath[pinnedWorkflow]
    );

    await updatePinnedWorkflow(gitHubContext, pW);
  }
}

async function refreshPinnedWorkflows() {
  const gitHubContext = await getGitHubContext();
  if (!gitHubContext) {
    return;
  }

  for (const pinnedWorkflow of pinnedWorkflows) {
    await updatePinnedWorkflow(gitHubContext, pinnedWorkflow);
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

function createPinnedWorkflow(id: string, name: string): PinnedWorkflow {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );

  const pinnedWorkflow = {
    workflowId: id,
    workflowName: name,
    statusBarItem,
  };

  pinnedWorkflows.push(pinnedWorkflow);

  return pinnedWorkflow;
}

async function updatePinnedWorkflow(
  gitHubContext: GitHubContext,
  pinnedWorkflow: PinnedWorkflow
) {
  try {
    const runs = await gitHubContext.client.actions.listWorkflowRuns({
      owner: gitHubContext.owner,
      repo: gitHubContext.name,
      workflow_id: pinnedWorkflow.workflowId as any, // Workflow can also be a file name
    });

    const { total_count, workflow_runs } = runs.data;
    if (total_count == 0) {
      // Workflow has never run, set default text
      pinnedWorkflow.statusBarItem.text = `$(${getCodIconForWorkflowrun()}) ${
        pinnedWorkflow.workflowName
      }`;

      // Can't do anything without a run
      pinnedWorkflow.statusBarItem.command = undefined;
    }

    const mostRecentRun = workflow_runs[0] as WorkflowRun;
    pinnedWorkflow.statusBarItem.text = `$(${getCodIconForWorkflowrun(
      mostRecentRun
    )}) ${pinnedWorkflow.workflowName}`;

    if (mostRecentRun.conclusion === "failure") {
      pinnedWorkflow.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground"
      );
    } else {
      pinnedWorkflow.statusBarItem.backgroundColor = undefined;
    }

    pinnedWorkflow.statusBarItem.command = {
      title: "Open workflow run",
      command: "github-actions.workflow.run.open",
      arguments: [
        {
          run: mostRecentRun,
        },
      ],
    };

    // TODO: Do we need to hide before?
    pinnedWorkflow.statusBarItem.show();
  } catch {
    // TODO: Display error
  }
}
