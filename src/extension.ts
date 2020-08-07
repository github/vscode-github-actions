import * as vscode from "vscode";
import { enableOrgFeatures } from "./auth/auth";
import { initConfiguration } from "./configuration/configuration";
import { getGitHubContext, GitHubContext } from "./git/repository";
import { LogScheme } from "./logs/constants";
import { WorkflowStepLogProvider } from "./logs/fileProvider";
import { WorkflowStepLogFoldingProvider } from "./logs/foldingProvider";
import { updateDecorations } from "./logs/formatProvider";
import { getLogInfo } from "./logs/logInfoProvider";
import { buildLogURI } from "./logs/scheme";
import { WorkflowStepLogSymbolProvider } from "./logs/symbolProvider";
import {
  OrgSecret,
  RepoSecret,
  Workflow,
  WorkflowJob,
  WorkflowRun,
  WorkflowStep,
} from "./model";
import { initPinnedWorkflows } from "./pinnedWorkflows/pinnedWorkflows";
import { encodeSecret } from "./secrets";
import { initWorkflowDocumentTracking } from "./tracker/workflowDocumentTracker";
import { initResources } from "./treeViews/icons";
import { SettingsTreeProvider } from "./treeViews/settings";
import { ActionsExplorerProvider as WorkflowsTreeProvider } from "./treeViews/workflows";
import { init } from "./workflow/diagnostics";
import {
  getRepositoryDispatchTypes,
  getWorkflowUri,
} from "./workflow/workflow";

export function activate(context: vscode.ExtensionContext) {
  // Prefetch git repository origin url
  getGitHubContext();

  initResources(context);

  initConfiguration(context);
  initPinnedWorkflows(context);

  // Track workflow
  initWorkflowDocumentTracking(context);

  // Actions Explorer
  const workflowTreeProvider = new WorkflowsTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "github-actions.workflows",
      workflowTreeProvider
    )
  );

  const settingsTreeProvider = new SettingsTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "github-actions.settings",
      settingsTreeProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.explorer.refresh", () => {
      workflowTreeProvider.refresh();
      settingsTreeProvider.refresh();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.explorer.openRun",
      (args) => {
        const url = args.url || args;
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
      }
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.explorer.openWorkflowFile",
      async (args) => {
        const wf: Workflow = args.wf;

        const fileUri = getWorkflowUri(wf.path);
        if (fileUri) {
          const textDocument = await vscode.workspace.openTextDocument(fileUri);
          vscode.window.showTextDocument(textDocument);
          return;
        }

        // File not found in workspace
        vscode.window.showErrorMessage(
          `Workflow ${wf.path} not found in current workspace`
        );
      }
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.explorer.triggerRun",
      async (args) => {
        let event_type: string | undefined;

        let workflowUri: vscode.Uri | null = null;

        const wf: Workflow = args.wf;
        if (wf) {
          workflowUri = getWorkflowUri(wf.path);
        } else if (args.fsPath) {
          workflowUri = args;
        }

        if (!workflowUri) {
          return;
        }

        const event_types = getRepositoryDispatchTypes(workflowUri.fsPath);
        if (event_types?.length > 0) {
          const custom_type = "✐ Enter custom type";
          const selection = await vscode.window.showQuickPick(
            [custom_type, ...event_types],
            {
              placeHolder: "Select an event_type to dispatch",
            }
          );

          if (selection === undefined) {
            return;
          } else if (selection != custom_type) {
            event_type = selection;
          }
        }

        if (event_type === undefined) {
          event_type = await vscode.window.showInputBox({
            prompt: "Enter `event_type` to dispatch to the repository",
            value: "default",
          });
        }

        if (event_type) {
          const gitHubContext: GitHubContext =
            args.gitHubContext || (await getGitHubContext());
          await gitHubContext.client.repos.createDispatchEvent({
            owner: gitHubContext.owner,
            repo: gitHubContext.name,
            event_type,
            client_payload: {},
          });

          vscode.window.setStatusBarMessage(
            `GitHub Actions: Repository event '${event_type}' dispatched`,
            2000
          );

          workflowTreeProvider.refresh();
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.auth.org-login",
      async () => {
        enableOrgFeatures();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.workflow.run.open",
      async (args) => {
        const run: WorkflowRun = args.run;
        const url = run.html_url;
        vscode.env.openExternal(vscode.Uri.parse(url));
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.workflow.logs",
      async (args) => {
        const gitHubContext: GitHubContext = args.gitHubContext;
        const job: WorkflowJob = args.job;
        const step: WorkflowStep | undefined = args.step;
        const uri = buildLogURI(
          gitHubContext.owner,
          gitHubContext.name,
          job.id,
          step?.name
        );
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc, {
          preview: false,
        });

        const logInfo = getLogInfo(uri);
        if (!logInfo) {
          throw new Error("Could not get log info");
        }

        // Custom formatting after the editor has been opened
        updateDecorations(editor, logInfo);

        // Deep linking
        if (step) {
          let matchingSection = logInfo.sections.find(
            (s) => s.name && s.name === step.name
          );
          if (!matchingSection) {
            // If we cannot match by name, see if we can try to match by number
            matchingSection = logInfo.sections[step.number - 1];
          }

          if (matchingSection) {
            editor.revealRange(
              new vscode.Range(
                matchingSection.start,
                0,
                matchingSection.start,
                0
              ),
              vscode.TextEditorRevealType.InCenter
            );
          }
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.workflow.run.rerun",
      async (args) => {
        const gitHubContext: GitHubContext = args.gitHubContext;
        const run: WorkflowRun = args.run;

        try {
          await gitHubContext.client.actions.reRunWorkflow({
            owner: gitHubContext.owner,
            repo: gitHubContext.name,
            run_id: run.id,
          });
        } catch (e) {
          vscode.window.showErrorMessage(
            `Could not rerun workflow: '${e.message}'`
          );
        }

        workflowTreeProvider.refresh();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.workflow.run.cancel",
      async (args) => {
        const gitHubContext: GitHubContext = args.gitHubContext;
        const run: WorkflowRun = args.run;

        try {
          await gitHubContext.client.actions.cancelWorkflowRun({
            owner: gitHubContext.owner,
            repo: gitHubContext.name,
            run_id: run.id,
          });
        } catch (e) {
          vscode.window.showErrorMessage(
            `Could not cancel workflow: '${e.message}'`
          );
        }

        workflowTreeProvider.refresh();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.settings.secrets.manage",
      async (args) => {
        const gitHubContext: GitHubContext = args.gitHubContext;

        // Open link to manage org-secrets
        vscode.commands.executeCommand(
          "vscode.open",
          vscode.Uri.parse(
            `https://github.com/organizations/${gitHubContext.owner}/settings/secrets`
          )
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.settings.secret.add",
      async (args) => {
        const gitHubContext: GitHubContext = args.gitHubContext;

        const name = await vscode.window.showInputBox({
          prompt: "Enter name for new secret",
        });

        if (!name) {
          return;
        }

        const value = await vscode.window.showInputBox({
          prompt: "Enter the new secret value",
        });

        if (value) {
          try {
            const keyResponse = await gitHubContext.client.actions.getRepoPublicKey(
              {
                owner: gitHubContext.owner,
                repo: gitHubContext.name,
              }
            );

            const key_id = keyResponse.data.key_id;
            const key = keyResponse.data.key;

            await gitHubContext.client.actions.createOrUpdateRepoSecret({
              owner: gitHubContext.owner,
              repo: gitHubContext.name,
              secret_name: name,
              key_id: key_id,
              encrypted_value: encodeSecret(key, value),
            });
          } catch (e) {
            vscode.window.showErrorMessage(e.message);
          }
        }

        settingsTreeProvider.refresh();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.settings.secret.delete",
      async (args) => {
        const gitHubContext: GitHubContext = args.gitHubContext;
        const secret: RepoSecret = args.secret;

        await gitHubContext.client.actions.deleteRepoSecret({
          owner: gitHubContext.owner,
          repo: gitHubContext.name,
          secret_name: secret.name,
        });

        settingsTreeProvider.refresh();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.settings.secret.copy",
      async (args) => {
        const secret: RepoSecret | OrgSecret = args.secret;

        vscode.env.clipboard.writeText(secret.name);

        vscode.window.setStatusBarMessage(`Copied ${secret.name}`, 2000);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.settings.secret.update",
      async (args) => {
        const gitHubContext: GitHubContext = args.gitHubContext;
        const secret: RepoSecret = args.secret;

        const value = await vscode.window.showInputBox({
          prompt: "Enter the new secret value",
        });

        if (value) {
          try {
            const keyResponse = await gitHubContext.client.actions.getRepoPublicKey(
              {
                owner: gitHubContext.owner,
                repo: gitHubContext.name,
              }
            );

            const key_id = keyResponse.data.key_id;
            const key = keyResponse.data.key;

            await gitHubContext.client.actions.createOrUpdateRepoSecret({
              owner: gitHubContext.owner,
              repo: gitHubContext.name,
              secret_name: secret.name,
              key_id: key_id,
              encrypted_value: encodeSecret(key, value),
            });
          } catch (e) {
            vscode.window.showErrorMessage(e.message);
          }
        }
      }
    )
  );

  //
  // Log providers
  //
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      LogScheme,
      new WorkflowStepLogProvider()
    )
  );

  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider(
      { scheme: LogScheme },
      new WorkflowStepLogFoldingProvider()
    )
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      {
        scheme: LogScheme,
      },
      new WorkflowStepLogSymbolProvider()
    )
  );

  //
  // Editing
  //
  // context.subscriptions.push(
  //   vscode.languages.registerCompletionItemProvider(
  //     {
  //       pattern: "**/.github/workflows/*.{yaml,yml}",
  //     },
  //     new SecretsCompletionItemProvider(),
  //     "."
  //   )
  // );

  init(context);
}
