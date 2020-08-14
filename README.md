# GitHub Actions for VS Code

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/cschleiden/vscode-github-actions/Build)

Simple, **unofficial** extension to interact with GitHub Actions from within VS Code.

## Installation

1. Install extension
2. Open a repository with a `github.com` origin
3. When prompted, allow `GitHub Actions` to access your `github` account

## Features

### View workflows for the currently opened repository

![See workflows and runs for the current repository](./media/runs.png)

### View workflow runs and their status

![View workflows and their status](./media/runs2.png)

### Inspect logs to see failures

![Display logs for workflow runs](./media/logs.gif)

![Colored logs](./media/colored-logs.png)

### Trigger runs

If a workflow uses `repository_dispatch` as a trigger, you can start a new workflow run from the workflow context menu:

![](./media/rdispatch.gif)

Or from the workflow list:

![](./media/inline-dispatch.png)

Or from the editor when editing a workflow:

![](./media/inline-dispatch-editor.png)

### Pin workflows and see their status updated automatically

You can pin workflows to the status bar per workspace, and automatically see the status of the most recent run. For example, to see if the change you just pushed passes the CI Build:
![](./media/pin-workflows.gif)

1. To setup, configure the `"github-actions.workflows.pinned.workflows"` property on a global level, or per workspace (`.vscode/settings.json`):

```json
{
    "github-actions.workflows.pinned.workflows": [".github/workflows/build.yml", ".github/workflows/create.yml"],
}
```

2. To enable auto-refresh via polling, set `refresh.enabled` to `true`. This works by polling the workflow runs API with a default interval of `30` seconds. You can customized the interal via `refresh.interval`:

```json
{
    "github-actions.workflows.pinned.workflows": [".github/workflows/build.yml", ".github/workflows/create.yml"],
    "github-actions.workflows.pinned.refresh.enabled": true,
    "github-actions.workflows.pinned.refresh.interval": 65,
}
```


## Known issues

