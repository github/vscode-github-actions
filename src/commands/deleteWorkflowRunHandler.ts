export const DELETE_WORKFLOW_RUN_ACCEPT_TEXT = "Yes, delete this workflow run";

export interface DeleteWorkflowRunTarget {
  gitHubRepoContext: {
    owner: string;
    name: string;
    client: {
      actions: {
        deleteWorkflowRun(params: {owner: string; repo: string; run_id: number}): Promise<unknown>;
      };
    };
  };
  run: {
    run: {
      id: number;
      run_number: number;
    };
  };
}

export interface DeleteWorkflowRunUI {
  confirmDelete(
    message: string,
    options: {modal: boolean; detail: string},
    acceptText: string
  ): PromiseLike<string | undefined>;
  executeCommand(command: string): PromiseLike<unknown>;
  showErrorMessage(message: string): PromiseLike<string | undefined>;
}

export async function executeDeleteWorkflowRun(
  target: DeleteWorkflowRunTarget,
  ui: DeleteWorkflowRunUI
): Promise<void> {
  const {gitHubRepoContext, run} = target;

  try {
    const answer = await ui.confirmDelete(
      `Are you sure you want to delete workflow run #${run.run.run_number}?`,
      {
        modal: true,
        detail: "Deleting this workflow run cannot be undone and will permanently remove its logs and artifacts."
      },
      DELETE_WORKFLOW_RUN_ACCEPT_TEXT
    );

    if (answer === DELETE_WORKFLOW_RUN_ACCEPT_TEXT) {
      await gitHubRepoContext.client.actions.deleteWorkflowRun({
        owner: gitHubRepoContext.owner,
        repo: gitHubRepoContext.name,
        run_id: run.run.id
      });
      await ui.executeCommand("github-actions.explorer.refresh");
      await ui.executeCommand("github-actions.explorer.current-branch.refresh");
    }
  } catch (e) {
    await ui.showErrorMessage(`Could not delete workflow run: '${(e as Error).message}'`);
  }
}
