# Test Plan for Issue #229 Fix

## Objective
Verify that the GitHub Actions extension automatically refreshes the workflow run list after a user manually triggers a workflow run.

## Prerequisites
1.  A GitHub repository with GitHub Actions enabled.
2.  A workflow file in that repository that supports `workflow_dispatch` (manual trigger).
    *   Example `workflow_dispatch` configuration in `.github/workflows/test.yml`:
        ```yaml
        name: Manual Test
        on: workflow_dispatch
        jobs:
          build:
            runs-on: ubuntu-latest
            steps:
              - run: echo "Hello World"
        ```
3.  The repository is cloned locally and opened in VS Code.

## Manual Test Steps

1.  **Launch Extension in Debug Mode**:
    *   Open the `vscode-github-actions` project in VS Code.
    *   Press `F5` or go to "Run and Debug" and select "Watch & Launch Extension".
    *   This will open a new "Extension Development Host" window.

2.  **Open Test Repository**:
    *   In the Extension Development Host window, open the folder of your test repository (from Prerequisites).

3.  **Navigate to GitHub Actions View**:
    *   Click on the GitHub Actions icon in the Activity Bar (sidebar).
    *   Expand the "Workflows" section.
    *   Find your manual workflow (e.g., "Manual Test").

4.  **Trigger Workflow Run**:
    *   Right-click on the workflow name.
    *   Select **"Run Workflow"**.
    *   (Optional) If prompted for branch or inputs, provide them and confirm.

5.  **Verify Behavior**:
    *   **Immediate Feedback**: Look for a status bar message or notification saying "Waiting for workflow run to start...".
    *   **Auto-Refresh**: Watch the "Workflows" list. Within 1-20 seconds, the list should automatically refresh.
    *   **New Run**: A new workflow run (likely in "Queued" or "In Progress" state) should appear at the top of the list under the workflow.

## Expected Result
*   The user does **not** need to manually click the refresh button.
*   The UI updates automatically once the new run is created on GitHub.

## Troubleshooting
*   If the run doesn't appear after 20 seconds, check if the workflow actually started on GitHub.com.
*   Check the "Output" panel (select "GitHub Actions" in the dropdown) for any error logs.
