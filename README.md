> **Note**
>
> GitHub is currently working on officially supporting this extension. Read more about our plans in our [public roadmap issue](https://github.com/github/roadmap/issues/564). We will be dedicating resources to cleaning up the extension, squashing bugs, and more so your experience with Actions in VS Code is better than ever!


# GitHub Actions for VS Code

[![Build](https://github.com/cschleiden/vscode-github-actions/actions/workflows/build.yml/badge.svg)](https://github.com/cschleiden/vscode-github-actions/actions/workflows/build.yml)

Simple extension to interact with GitHub Actions from within VS Code.

## Setup

1. Install the extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=cschleiden.vscode-github-actions)
2. Open a repository with a `github.com` `origin` git remote
3. When prompted, allow `GitHub Actions` access to your GitHub account:

    ![Sign in via Accounts menu](./media/allow-access.png)

## Features

The extension provides a convenient way to monitor workflows and workflow runs from VS Code as well as language-server features for editing workflow YAML files.

### Auto-complete and documentation

No additional YAML extension needed, this extension includes a built-in language server with support for the workflow schema:

![Workflow auto-complete](./media/workflow-auto-complete.gif)

Auto-completion and validation for every action you reference in `uses`:

![Actions auto-complete](./media/actions-auto-complete.gif)

Auto-completion and validation of labels for hosted and self-hosted runners:

![Auto-complete runner label](./media/runs-on-auto-complete.gif)

#### Expressions auto-complete

Auto-completion, validation, and evaluation of expressions:

![Auto-complete and evaluation of expressions](./media/env-auto-complete.gif)

Auto-complete and validate all webhook event payloads:

![Auto-complete github event expressions](./media/github-auto-complete.gif)

### Monitor workflow runs

See runs for workflows in the repository, drill into jobs and steps, and inspect logs:

![See workflows and runs for the current repository](./media/logs.gif)


### Other features

- Trigger `repository_dispatch` or `workflow_dispatch` workflow runs
- View registered self-hosted runners and environments for the current repository
- View, edit, and add secrets
- Pin workflow to the VS Code status bar
