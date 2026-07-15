import * as vscode from "vscode";

import * as path from "path";

import {
  getGitHead,
  getGitHubContextForWorkspaceUri,
  getGitRepositoryFolderUri,
  GitHubRepoContext
} from "../git/repository";
import {getWorkflowUri, parseWorkflowFile} from "../workflow/workflow";

import {Workflow} from "../model";

interface TriggerRunCommandOptions {
  wf?: Workflow;
  gitHubRepoContext: GitHubRepoContext;
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
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(workflowUri);

        // support git sub directory
        const gitRepoFolderUri = workspaceFolder ? workspaceFolder?.uri : await getGitRepositoryFolderUri(workflowUri);
        if (!gitRepoFolderUri) {
          return;
        }

        const gitHubRepoContext = await getGitHubContextForWorkspaceUri(gitRepoFolderUri);
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
              // support git sub directory
              const relativeWorkflowPath = workspaceFolder
                ? vscode.workspace.asRelativePath(workflowUri, false)
                : path.relative(gitRepoFolderUri.path, workflowUri.path);
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
