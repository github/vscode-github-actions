import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import manifest from "../../package.json";
import {
  DELETE_WORKFLOW_RUN_ACCEPT_TEXT,
  DeleteWorkflowRunTarget,
  DeleteWorkflowRunUI,
  executeDeleteWorkflowRun
} from "./deleteWorkflowRunHandler";

describe("github-actions.workflow.run.delete (#293)", () => {
  const confirmDeleteMock = jest.fn<DeleteWorkflowRunUI["confirmDelete"]>();
  const executeCommandMock = jest.fn<DeleteWorkflowRunUI["executeCommand"]>();
  const showErrorMessageMock = jest.fn<DeleteWorkflowRunUI["showErrorMessage"]>();

  const ui: DeleteWorkflowRunUI = {
    confirmDelete: confirmDeleteMock,
    executeCommand: executeCommandMock,
    showErrorMessage: showErrorMessageMock
  };

  beforeEach(() => {
    confirmDeleteMock.mockReset();
    executeCommandMock.mockReset().mockResolvedValue(undefined);
    showErrorMessageMock.mockReset().mockResolvedValue(undefined);
  });

  function createTarget(
    deleteWorkflowRun: DeleteWorkflowRunTarget["gitHubRepoContext"]["client"]["actions"]["deleteWorkflowRun"]
  ): DeleteWorkflowRunTarget {
    return {
      gitHubRepoContext: {
        owner: "octo-org",
        name: "octo-repo",
        client: {
          actions: {
            deleteWorkflowRun
          }
        }
      },
      run: {
        run: {
          id: 987654,
          run_number: 42
        }
      }
    };
  }

  it("contributes command, inline remove button, and context menu item for completed runs", () => {
    const commandEntry = manifest.contributes.commands.find(c => c.command === "github-actions.workflow.run.delete");
    expect(commandEntry).toEqual({
      command: "github-actions.workflow.run.delete",
      category: "GitHub Actions",
      title: "Delete workflow run",
      when: "viewItem =~ /run/ && viewItem =~ /rerunnable/",
      icon: {
        dark: "resources/icons/dark/remove.svg",
        light: "resources/icons/light/remove.svg"
      }
    });

    const menuItems = manifest.contributes.menus["view/item/context"].filter(
      item => item.command === "github-actions.workflow.run.delete"
    );
    expect(menuItems).toEqual([
      {
        command: "github-actions.workflow.run.delete",
        when: "viewItem =~ /run/ && viewItem =~ /rerunnable/",
        group: "inline@2"
      },
      {
        command: "github-actions.workflow.run.delete",
        when: "viewItem =~ /run/ && viewItem =~ /rerunnable/"
      }
    ]);
  });

  it("confirms deletion via modal dialog, deletes the workflow run, and refreshes tree views", async () => {
    const deleteApiMock =
      jest.fn<DeleteWorkflowRunTarget["gitHubRepoContext"]["client"]["actions"]["deleteWorkflowRun"]>();
    deleteApiMock.mockResolvedValue({});
    confirmDeleteMock.mockResolvedValue(DELETE_WORKFLOW_RUN_ACCEPT_TEXT);

    await executeDeleteWorkflowRun(createTarget(deleteApiMock), ui);

    expect(confirmDeleteMock).toHaveBeenCalledWith(
      "Are you sure you want to delete workflow run #42?",
      {
        modal: true,
        detail: "Deleting this workflow run cannot be undone and will permanently remove its logs and artifacts."
      },
      "Yes, delete this workflow run"
    );
    expect(deleteApiMock).toHaveBeenCalledWith({
      owner: "octo-org",
      repo: "octo-repo",
      run_id: 987654
    });
    expect(executeCommandMock.mock.calls.map(call => call[0])).toEqual([
      "github-actions.explorer.refresh",
      "github-actions.explorer.current-branch.refresh"
    ]);
  });

  it("does not delete or refresh when the user cancels the confirmation modal", async () => {
    const deleteApiMock =
      jest.fn<DeleteWorkflowRunTarget["gitHubRepoContext"]["client"]["actions"]["deleteWorkflowRun"]>();
    deleteApiMock.mockResolvedValue({});
    confirmDeleteMock.mockResolvedValue(undefined);

    await executeDeleteWorkflowRun(createTarget(deleteApiMock), ui);

    expect(deleteApiMock).not.toHaveBeenCalled();
    expect(executeCommandMock).not.toHaveBeenCalled();
    expect(showErrorMessageMock).not.toHaveBeenCalled();
  });

  it("surfaces API errors via showErrorMessage without refreshing tree views", async () => {
    const deleteApiMock =
      jest.fn<DeleteWorkflowRunTarget["gitHubRepoContext"]["client"]["actions"]["deleteWorkflowRun"]>();
    deleteApiMock.mockRejectedValue(new Error("Must have admin rights to Repository."));
    confirmDeleteMock.mockResolvedValue(DELETE_WORKFLOW_RUN_ACCEPT_TEXT);

    await executeDeleteWorkflowRun(createTarget(deleteApiMock), ui);

    expect(showErrorMessageMock).toHaveBeenCalledWith(
      "Could not delete workflow run: 'Must have admin rights to Repository.'"
    );
    expect(executeCommandMock).not.toHaveBeenCalled();
  });
});
