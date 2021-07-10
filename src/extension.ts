import * as vscode from "vscode";
import { registerOpenWorkflowFile } from "./commands/openWorkflowFile";
import { registerOpenWorkflowRun } from "./commands/openWorkflowRun";
import { registerOpenWorkflowRunLogs } from "./commands/openWorkflowRunLogs";
import { registerTriggerWorkflowRun } from "./commands/triggerWorkflowRun";
import { getGitHubContext } from "./git/repository";
import { LogScheme } from "./logs/constants";
import { WorkflowStepLogProvider } from "./logs/fileProvider";
import { WorkflowStepLogFoldingProvider } from "./logs/foldingProvider";
import { WorkflowStepLogSymbolProvider } from "./logs/symbolProvider";
import { initWorkflowDocumentTracking } from "./tracker/workflowDocumentTracker";
import { initResources } from "./treeViews/icons";
import { SettingsTreeProvider } from "./treeViews/settings";
import { WorkflowsTreeProvider } from "./treeViews/workflows";

export function activate(context: vscode.ExtensionContext) {
  // Prefetch git repository origin url
  getGitHubContext();

  initResources(context);

  // initConfiguration(context);
  // initPinnedWorkflows(context);

  // Track workflow
  initWorkflowDocumentTracking(context);

  //
  // Tree views
  //

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

  //
  // Commands
  //

  registerOpenWorkflowRun(context);
  registerOpenWorkflowFile(context);
  registerOpenWorkflowRunLogs(context);

  registerTriggerWorkflowRun(context);

  /*


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
  */

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

  /*
  //
  // Editing features
  //
  init(context);
  */
}
