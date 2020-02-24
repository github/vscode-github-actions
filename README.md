# GitHub Actions for VS Code

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/cschleiden/vscode-github-actions/Build)

Simple, **unofficial** extension to interact with GitHub Actions from within VS Code. 

## Installation 

1. Install extension
2. Open a repository with a `github.com` origin
3. When prompted, enter a PAT with `repo` scope to authenticate against the API

## Features

### View workflows for the currently opened repository

![See workflows and runs for the current repository](./media/runs.png)

### View workflow runs and their status

![View workflows and their status](./media/runs2.png)

### Inspect logs to see failures

![Display logs for workflow runs](./media/logs.gif)

![Colored logs](./media/colored-logs.png)

### Trigger runs

If a workflow uses `repository_dispatch` as a trigger, you can start a new workflow run from the VS Code view:

![](./media/rdispatch.gif)

## Known issues

