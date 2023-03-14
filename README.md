# GitHub Actions for VS Code

The GitHub Actions extension lets you manage you manage your workflows, view the workflow run history, and helps with authoring workflows.

![](./media/header.png)

## Features

### Manage workflows and runs

Manage your workflows and runs without leaving your editor. Keep track of your CI builds and deployments. Investigate failures and view logs.

![View workflow runs and logs](./media/workflows.png)

### Workflow authoring

Be more confident when authoring and modifying workflows. Find errors before committing workflows with:

**Syntax highlighting** for workflows and GitHub Actions Expressions makes it clear where values are inserted at execution time:

![Syntax highlighting](media/highlight.png)

**Integrated documentation** for the workflow schema, expression functions, and even event payloads:

![Tooltip showing description for a pull_request payload](media/docs.png)

**Validation and code completion** for the YAML schema and GitHub Action Expressions. Get instant validation and code completion for the workflow schema, expression functions, event payloads, and job or step `outputs`:

![Validation for YAML keys and expressions](media/validation.png)

**Smart validation and code completion for actions and reusable workflows**: the extension automatically parses parameters, inputs, and outputs for referenced actions and called reusable workflows for code-completion and validation.

![Video showing workflow validation and auto-completion](./media/authoring.gif)

## Getting started

1. Install the extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=github.vscode-github-actions)
1. Sign in with your GitHub account and when prompted allow `GitHub Actions` access to your GitHub account.
1. Open a GitHub repository

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md).

## License

This project is licensed under the terms of the MIT open source license. Please refer to [MIT](../LICENSE) for the full terms.