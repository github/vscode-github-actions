# GitHub Actions for VS Code

The GitHub Actions extension lets you manage your workflows, view the workflow run history, and helps with authoring workflows.

![](./media/header.png)

## Features

### Manage workflows and runs

* Manage your workflows and runs without leaving your editor.
* Keep track of your CI builds and deployments.
* Investigate failures and view logs.

![View workflow runs and logs](./media/workflows.png)

### Workflow authoring

Be more confident when authoring and modifying workflows. Find errors before committing workflows with:

**Syntax highlighting** for workflows and GitHub Actions Expressions makes it clear where values are inserted at execution time:

![Syntax highlighting](media/highlight.png)

**Integrated documentation** for the workflow schema, expression functions, and even event payloads:

![Tooltip showing description for a pull_request payload](media/docs.png)

**Validation and code completion** for the YAML schema and GitHub Actions Expressions. Get instant validation and code completion for the workflow schema, expression functions, event payloads, and job or step `outputs`:

![Validation for YAML keys and expressions](media/validation.png)

**Smart validation and code completion for actions and reusable workflows**: the extension automatically parses parameters, inputs, and outputs for referenced actions and called reusable workflows for code-completion and validation.

![Video showing workflow validation and auto-completion](./media/authoring.gif)

## Getting started

1. Install the extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=github.vscode-github-actions).
1. Sign in with your GitHub account and when prompted allow `GitHub Actions` access to your GitHub account.
1. Open a GitHub repository.
1. You will be able to utilize the syntax features in Workflow files, and you can find the GitHub Actions icon on the left navigation to manage your Workflows.

## Key Components

<!-- If the Mermaid diagrams below aren't rendering in VS Code preview, install the "Markdown Preview Mermaid Support" extension -->

```mermaid
graph LR
    subgraph "User Interface"
        WF[Workflows View]
        CB[Current Branch View]
        SET[Settings View]
        EDITOR[Workflow Editor]
    end
    
    subgraph "Core Features"
        AUTH[Authentication]
        MANAGE[Workflow Management]
        LOGS[Log Viewing]
        VALID[Validation & Completion]
    end
    
    subgraph "Data Management"
        STORE[Run Store]
        SECRETS[Secrets/Variables]
        PIN[Pinned Workflows]
    end
    
    WF --> MANAGE
    WF --> PIN
    CB --> MANAGE
    SET --> SECRETS
    EDITOR --> VALID
    
    MANAGE --> STORE
    MANAGE --> AUTH
    LOGS --> STORE
    VALID --> AUTH
    SECRETS --> AUTH
    PIN --> MANAGE
    
    style AUTH fill:#fd8c73
    style MANAGE fill:#58a6ff
    style VALID fill:#3fb950
```

## Supported Features

- Manage your workflows and runs 
- Edit workflows (syntax highlighting, auto-completion, hovering, and validation)
- Keep track of your CI builds and deployments
- Investigate failures and view logs
- Modify settings like Environments, Secrets, and Variables

Unfortunately, at this time we are not able to support the extension with [remote repositories](https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories) (including [github.dev](https://github.dev/) and [vscode.dev](https://vscode.dev/)), so please use the extension with locally downloaded GitHub repositories for the best experience. Please check back here for updates in the future!

We have enabled experimental functionality to support GitHub Enterprise Server, but this feature is an experimental beta and currently unsupported. To try this out, enable the `use-enterprise` setting to authenticate with your `GitHub Enterprise Server Authentication Provider` settings
<img width="975" alt="Use-enterprise setting checkbox" src="https://github.com/github/vscode-github-actions/assets/34719884/be76adc6-64af-47ed-84d0-627786cc4eea">

We currently do not have the capability to support Operating System (OS) certificates or enterprise proxies (we plan to support pulling from the VS Code proxy settings), but we have plans for it in the future and it is on our backlog! 

## Architecture Overview

```mermaid
graph TB
    subgraph "VS Code Extension"
        EXT[Extension Host]
        TV[Tree Views]
        CMD[Commands]
        TRACK[Workspace Tracker]
    end
    
    subgraph "Language Support"
        LC[Language Client]
        LS[Language Server]
        WP[Workflow Parser]
        EE[Expression Engine]
    end
    
    subgraph "External Services"
        GH[GitHub API]
        REPO[Git Repository]
    end
    
    EXT --> LC
    EXT --> TV
    EXT --> CMD
    EXT --> TRACK
    
    LC <--> LS
    LS --> WP
    LS --> EE
    WP --> EE
    
    TV --> GH
    CMD --> GH
    TRACK --> REPO
    LS --> GH
    
    style EXT fill:#2ea44f
    style LS fill:#0969da
    style GH fill:#8250df
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). A description of the architecture of the extension can be found [here](./docs/project-architecture.md).

## License

This project is licensed under the terms of the MIT open source license. Please refer to [MIT](LICENSE) for the full terms.
