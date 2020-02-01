# GitHub Actions for VS Code

**This is pre-release software, use at your own risk**

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/cschleiden/vscode-github-actions/Build)

Very simple, **unofficial** extension to interact with GitHub Actions from within VS Code. 

## Installation 

1. Install extension
2. Open a repository with a `github.com` origin
3. When prompted, enter a PAT with `repo` scope to authenticate against the API

## Features

### View workflows for the currently opened repository

![](./media/runs.png)

### View workflow runs and conclusions

![](./media/runs2.png)

### Trigger runs

If a workflow uses `repository_dispatch` as a trigger, you can start a new workflow run from the VS Code view:

![](./media/rdispatch.gif)

## Known issues

