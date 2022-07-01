# GitHub Actions for VS Code

[![Build](https://github.com/cschleiden/vscode-github-actions/actions/workflows/build.yml/badge.svg)](https://github.com/cschleiden/vscode-github-actions/actions/workflows/build.yml)

Simple extension to interact with GitHub Actions from within VS Code.

## Installation

1. Install extension
2. Open a repository with a `github.com` origin
3. When prompted, allow `GitHub Actions` to access your `github` account from the "Accounts" menu:

    ![Sign in via Accounts menu](./media/sign-in.png)

## Features

### Auto-complete and documentation

No additional YAML extension needed, this extension includes a built-in language server with support for the workflow schema:

![Workflow auto-complete](./media/workflow-auto-complete.gif)

#### Actions parameters

Auto-completion and validation for every action you reference in `uses`:

![Actions auto-complete](./media/actions-auto-complete.gif)

#### Runner labels

Auto-completion and validation of labels for hosted and self-hosted runners:

![Auto-complete runner label](./media/runs-on-auto-complete.gif)

### Expressions

Auto-completion, validation, and evaluation of expressions:

![Auto-complete and evaluation of expressions](./media/env-auto-complete.gif)

#### `github` event expressions

Auto-complete and validate all webhook event payloads:

![Auto-complete github event expressions](./media/github-auto-complete.gif)

### View workflows for the currently opened repository

![See workflows and runs for the current repository](./media/runs.png)

### View workflow runs and their status

![View workflows and their status](./media/runs2.png)

### Inspect logs to see failures

![Display logs for workflow runs](./media/logs.gif)

![Colored logs](./media/colored-logs.png)

### Trigger runs

If a workflow uses `repository_dispatch` or `workflow_dispatch` as a trigger, you can start a new workflow run from the workflow context menu:

![](./media/rdispatch.gif)

Or from the workflow list:

![](./media/inline-dispatch.png)

Or from the editor when editing a workflow:

![](./media/inline-dispatch-editor.png)

### Pin workflows and see their status updated automatically

You can pin workflows to the status bar per workspace, and automatically see the status of the most recent run. For example, to see if the change you just pushed passes the CI Build:
![](./media/pin-workflows.gif)

### View workflow runs for the current branch

![](./media/workflows-current-branch.gif)