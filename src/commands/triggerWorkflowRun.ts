import {basename} from "path";
import * as vscode from "vscode";

import {getGitHead, getGitHubContextForWorkspaceUri, GitHubRepoContext} from "../git/repository";
import {getWorkflowUri, parseWorkflowFile} from "../workflow/workflow";

import {Workflow} from "../model";
import {RunStore} from "../store/store";

import {log} from "../log";

interface TriggerRunCommandOptions {
  wf?: Workflow;
  gitHubRepoContext: GitHubRepoContext;
}

export function registerTriggerWorkflowRun(context: vscode.ExtensionContext, store: RunStore) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.explorer.triggerRun",
      async (args: TriggerRunCommandOptions | vscode.Uri) => {
        let workflowUri: vscode.Uri | null = null;
        let workflowIdForApi: number | string | undefined;

        if (args instanceof vscode.Uri) {
          workflowUri = args;
          workflowIdForApi = basename(workflowUri.fsPath);
        } else if (args.wf) {
          const wf: Workflow = args.wf;
          workflowUri = getWorkflowUri(args.gitHubRepoContext, wf.path);
          workflowIdForApi = wf.id;
        }

        if (!workflowUri) {
          return;
        }

        // Parse
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(workflowUri);
        if (!workspaceFolder) {
          return;
        }

        const gitHubRepoContext = await getGitHubContextForWorkspaceUri(workspaceFolder.uri);
        if (!gitHubRepoContext) {
          return;
        }

        const workflow = await parseWorkflowFile(workflowUri);
        if (!workflow) {
          return;
        }

        const relativeWorkflowPath = vscode.workspace.asRelativePath(workflowUri, false);
        if (!workflowIdForApi) {
          workflowIdForApi = basename(workflowUri.fsPath);
        }

        let latestRunId: number | undefined;
        try {
          log(`Fetching latest run for workflow: ${workflowIdForApi}`);
          const result = await gitHubRepoContext.client.actions.listWorkflowRuns({
            owner: gitHubRepoContext.owner,
            repo: gitHubRepoContext.name,
            workflow_id: workflowIdForApi,
            per_page: 1
          });
          latestRunId = result.data.workflow_runs[0]?.id;
          log(`Latest run ID before trigger: ${latestRunId}`);
        } catch (e) {
          log(`Error fetching latest run: ${(e as Error).message}`);
        }

        let dispatched = false;

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
              await gitHubRepoContext.client.actions.createWorkflowDispatch({
                owner: gitHubRepoContext.owner,
                repo: gitHubRepoContext.name,
                workflow_id: relativeWorkflowPath,
                ref,
                inputs
              });

              dispatched = true;
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

            dispatched = true;
            vscode.window.setStatusBarMessage(`GitHub Actions: Repository event '${event_type}' dispatched`, 2000);
          }
        }

        if (dispatched) {
          vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Window,
              title: "Waiting for workflow run to start..."
            },
            async () => {
              log("Starting loop to check for new workflow run...");
              for (let i = 0; i < 20; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                try {
                  log(`Checking for new run (attempt ${i + 1}/20)...`);
                  const result = await gitHubRepoContext.client.actions.listWorkflowRuns({
                    owner: gitHubRepoContext.owner,
                    repo: gitHubRepoContext.name,
                    workflow_id: workflowIdForApi!,
                    per_page: 1
                  });
                  const newLatestRunId = result.data.workflow_runs[0]?.id;
                  log(`Latest run ID found: ${newLatestRunId} (Previous: ${latestRunId})`);

                  if (newLatestRunId && newLatestRunId !== latestRunId) {
                    log(`Found new workflow run: ${newLatestRunId}. Triggering refresh and polling.`);
                    await vscode.commands.executeCommand("github-actions.explorer.refresh");
                    // Poll for 15 minutes (225 * 4s)
                    store.pollRun(newLatestRunId, gitHubRepoContext, 4000, 225);
                    break;
                  }
                } catch (e) {
                  log(`Error checking for new run: ${(e as Error).message}`);
                }
              }
            }
          );
        }

        return vscode.commands.executeCommand("github-actions.explorer.refresh");
      }
    )
  );
}
