import { Octokit } from "@octokit/rest";
import * as vscode from "vscode";
import { getClient } from "../client/client";
import {
  getPinnedWorkflows,
  isPinnedWorkflowsRefreshEnabled,
  onPinnedWorkflowsChange,
  pinnedWorkflowsRefreshInterval,
} from "../configuration/configuration";
import { Protocol } from "../external/protocol";
import { getGitHubProtocol } from "../git/repository";
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

  const client = await getClient();
  const repo = await getGitHubProtocol();
  if (!repo) {
    return;
  }

  // Get all workflows to resolve names. We could do this locally, but for now, let's make the API call.
  const workflows = await client.actions.listRepoWorkflows({
    owner: repo.owner,
    repo: repo.repositoryName,
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

    await updatePinnedWorkflow(client, repo, pW);
  }
}

async function refreshPinnedWorkflows() {
  const client = await getClient();
  const repo = await getGitHubProtocol();
  if (!repo) {
    return;
  }

  for (const pinnedWorkflow of pinnedWorkflows) {
    await updatePinnedWorkflow(client, repo, pinnedWorkflow);
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
  client: Octokit,
  repo: Protocol,
  pinnedWorkflow: PinnedWorkflow
) {
  try {
    const runs = await client.actions.listWorkflowRuns({
      owner: repo.owner,
      repo: repo.repositoryName,
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
    pinnedWorkflow.statusBarItem.command = {
      title: "Open workflow run",
      command: "workflow.run.open",
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
