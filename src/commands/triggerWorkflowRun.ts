import * as vscode from "vscode";

import {getGitHead, getGitHubContextForWorkspaceUri, GitHubRepoContext, getGitExtension} from "../git/repository";
import {getRepositoryRootForDocumentUri} from "../git/submoduleHelper";
import {getWorkflowUri, parseWorkflowFile} from "../workflow/workflow";
import {Protocol} from "../external/protocol";

import {Workflow} from "../model";

interface TriggerRunCommandOptions {
  wf?: Workflow;
  gitHubRepoContext: GitHubRepoContext;
}

async function getGitHubContextForRepository(repositoryUri: vscode.Uri): Promise<GitHubRepoContext | undefined> {
  let context = await getGitHubContextForWorkspaceUri(repositoryUri);
  if (context) {
    return context;
  }

  const git = await getGitExtension();
  if (!git) {
    return undefined;
  }

  for (const repository of git.repositories) {
    if (repository.rootUri.fsPath === repositoryUri.fsPath) {
      await repository.status();
      const remote = repository.state.remotes.find(r => r.name === "origin") || repository.state.remotes[0];

      if (remote?.pushUrl) {
        try {
          const protocol = new Protocol(remote.pushUrl);
          return {
            owner: protocol.owner,
            name: protocol.repositoryName,
            client: undefined as any
          } as GitHubRepoContext;
        } catch {
          return undefined;
        }
      }
    }
  }

  return undefined;
}

export function registerTriggerWorkflowRun(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.explorer.triggerRun",
      async (args: TriggerRunCommandOptions | vscode.Uri) => {
        let workflowUri: vscode.Uri | null = null;
        if (args instanceof vscode.Uri) {
          workflowUri = args;
        } else if (args.wf) {
          const wf: Workflow = args.wf;
          workflowUri = getWorkflowUri(args.gitHubRepoContext, wf.path);
        }

        if (!workflowUri) {
          return;
        }

        // Parse
        let repositoryUri = await getRepositoryRootForDocumentUri(workflowUri);

        if (!repositoryUri) {
          const workspaceFolder = vscode.workspace.getWorkspaceFolder(workflowUri);
          if (!workspaceFolder) {
            return;
          }
          repositoryUri = workspaceFolder.uri;
        }

        const gitHubRepoContext = await getGitHubContextForRepository(repositoryUri);
        if (!gitHubRepoContext) {
          return;
        }

        const workflow = await parseWorkflowFile(workflowUri);
        if (!workflow) {
          return;
        }

        let selectedEvent: string | undefined;
        if (workflow.events.workflow_dispatch !== undefined && workflow.events.repository_dispatch !== undefined) {
          selectedEvent = await vscode.window.showQuickPick(["repository_dispatch", "workflow_dispatch"], {
            placeHolder: "Which event to trigger?"
          });
          if (!selectedEvent) {
            return;
          }
        }

        if (
          (!selectedEvent || selectedEvent === "workflow_dispatch") &&
          workflow.events.workflow_dispatch !== undefined
        ) {
          const ref = await vscode.window.showInputBox({
            prompt: "Enter ref to trigger workflow on",
            value: (await getGitHead()) || gitHubRepoContext.defaultBranch
          });

          if (ref) {
            // Inputs
            let inputs: {[key: string]: string} | undefined;
            const definedInputs = workflow.events.workflow_dispatch?.inputs;
            if (definedInputs) {
              inputs = {};

              for (const definedInput of Object.keys(definedInputs)) {
                const value = await vscode.window.showInputBox({
                  prompt: `Value for input ${definedInput} ${definedInputs[definedInput].required ? "[required]" : ""}`,
                  value: definedInputs[definedInput].default?.toString() || ""
                });
                if (!value && definedInputs[definedInput].required) {
                  return vscode.window.showErrorMessage(`Input ${definedInput} is required`);
                }

                if (value) {
                  inputs[definedInput] = value;
                }
              }
            }

            try {
              const workflowPath = workflowUri.fsPath;
              const repositoryPath = repositoryUri.fsPath;
              const relativeWorkflowPath = require("path").relative(repositoryPath, workflowPath).replace(/\\/g, "/");

              await gitHubRepoContext.client.actions.createWorkflowDispatch({
                owner: gitHubRepoContext.owner,
                repo: gitHubRepoContext.name,
                workflow_id: relativeWorkflowPath,
                ref,
                inputs
              });

              vscode.window.setStatusBarMessage(`GitHub Actions: Workflow event dispatched`, 2000);
            } catch (error) {
              return vscode.window.showErrorMessage(`Could not create workflow dispatch: ${(error as Error)?.message}`);
            }
          }
        } else if (
          (!selectedEvent || selectedEvent === "repository_dispatch") &&
          workflow.events.repository_dispatch !== undefined
        ) {
          let event_type: string | undefined;
          const event_types = workflow.events.repository_dispatch.types;
          if (Array.isArray(event_types) && event_types?.length > 0) {
            const custom_type = "✐ Enter custom type";
            const selection = await vscode.window.showQuickPick([custom_type, ...event_types], {
              placeHolder: "Select an event_type to dispatch"
            });

            if (selection === undefined) {
              return;
            } else if (selection != custom_type) {
              event_type = selection;
            }
          }

          if (event_type === undefined) {
            event_type = await vscode.window.showInputBox({
              prompt: "Enter `event_type` to dispatch to the repository",
              value: "default"
            });
          }

          if (event_type) {
            await gitHubRepoContext.client.repos.createDispatchEvent({
              owner: gitHubRepoContext.owner,
              repo: gitHubRepoContext.name,
              event_type,
              client_payload: {}
            });

            vscode.window.setStatusBarMessage(`GitHub Actions: Repository event '${event_type}' dispatched`, 2000);
          }
        }

        return vscode.commands.executeCommand("github-actions.explorer.refresh");
      }
    )
  );
}
