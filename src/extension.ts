import * as vscode from "vscode";
import { setPAT } from "./auth/pat";
import { Protocol } from "./external/protocol";
import { encodeSecret } from "./secrets";
import { initResources } from "./treeViews/icons";
import { SettingsTreeProvider } from "./treeViews/settings";
import { ActionsExplorerProvider as WorkflowsTreeProvider } from "./treeViews/workflows";
import { getWorkflowUri } from "./workflow/workflow";
import Octokit = require("@octokit/rest");
import { Workflow, WorkflowRun, Secret } from "./model";

export function activate(context: vscode.ExtensionContext) {
  initResources(context);

  // Actions Explorer
  const workflowTreeProvider = new WorkflowsTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("workflows", workflowTreeProvider)
  );

  const settingsTreeProvider = new SettingsTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("settings", settingsTreeProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("explorer.refresh", () => {
      workflowTreeProvider.refresh();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("explorer.openRun", args => {
      const url = args.url || args;
      vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("explorer.openWorkflowFile", async args => {
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
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("explorer.triggerRun", async args => {
      const event_type = await vscode.window.showInputBox({
        prompt: "Enter `event_type` to dispatch to the repository",
        value: "default"
      });
      if (event_type) {
        const repo: Protocol = args.repo;
        const client: Octokit = args.client;

        await client.repos.createDispatchEvent({
          owner: repo.owner,
          repo: repo.repositoryName,
          event_type,
          client_payload: {}
        });

        vscode.window.setStatusBarMessage(
          `GitHub Actions: Repository event '${event_type}' dispatched`,
          2000
        );

        workflowTreeProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("auth.login", async () => {
      const selection = await vscode.window.showQuickPick([
        "Enter PAT",
        "Use OAuth flow (coming soon)"
      ]);

      switch (selection) {
        case "Enter PAT":
          const token = await vscode.window.showInputBox({
            prompt: "Enter a GitHub PAT with `workflow` and `repo` scope:"
          });
          if (token) {
            await setPAT(token);
            workflowTreeProvider.refresh();
          }
          break;
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("workflow.run.open", async args => {
      const repo: Protocol = args.repo;
      const run: WorkflowRun = args.run;

      // TODO: use `html_url` once available
      const url = `https://${repo.host}/${repo.nameWithOwner}/commit/${run.head_sha}/checks`;

      vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("workflow.run.rerun", async args => {
      const repo: Protocol = args.repo;
      const run: WorkflowRun = args.run;
      const client: Octokit = args.client;

      try {
        await client.actions.reRunWorkflow({
          owner: repo.owner,
          repo: repo.repositoryName,
          run_id: run.id
        });
      } catch (e) {
        vscode.window.showErrorMessage(
          `Could not rerun workflow: '${e.message}'`
        );
      }

      workflowTreeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("workflow.run.cancel", async args => {
      const repo: Protocol = args.repo;
      const run: WorkflowRun = args.run;
      const client: Octokit = args.client;

      try {
        await client.actions.cancelWorkflowRun({
          owner: repo.owner,
          repo: repo.repositoryName,
          run_id: run.id
        });
      } catch (e) {
        vscode.window.showErrorMessage(
          `Could not cancel workflow: '${e.message}'`
        );
      }

      workflowTreeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("settings.secret.add", async args => {
      const repo: Protocol = args.repo;
      const client: Octokit = args.client;

      const name = await vscode.window.showInputBox({
        prompt: "Enter name for new secret"
      });

      if (!name) {
        return;
      }

      const value = await vscode.window.showInputBox({
        prompt: "Enter the new secret value"
      });

      if (value) {
        try {
          const keyResponse = await client.actions.getPublicKey({
            owner: repo.owner,
            repo: repo.repositoryName
          });

          const key_id = keyResponse.data.key_id;
          const key = keyResponse.data.key;

          await client.actions.createOrUpdateSecretForRepo({
            owner: repo.owner,
            repo: repo.repositoryName,
            name: name,
            key_id: key_id,
            encrypted_value: encodeSecret(key, value)
          });
        } catch (e) {
          vscode.window.showErrorMessage(e.message);
        }
      }

      settingsTreeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("settings.secret.delete", async args => {
      const repo: Protocol = args.repo;
      const secret: Secret = args.secret;
      const client: Octokit = args.client;

      await client.actions.deleteSecretFromRepo({
        owner: repo.owner,
        repo: repo.repositoryName,
        name: secret.name
      });

      settingsTreeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("settings.secret.update", async args => {
      const repo: Protocol = args.repo;
      const secret: Secret = args.secret;
      const client: Octokit = args.client;

      const value = await vscode.window.showInputBox({
        prompt: "Enter the new secret value"
      });

      if (value) {
        try {
          const keyResponse = await client.actions.getPublicKey({
            owner: repo.owner,
            repo: repo.repositoryName
          });

          const key_id = keyResponse.data.key_id;
          const key = keyResponse.data.key;

          await client.actions.createOrUpdateSecretForRepo({
            owner: repo.owner,
            repo: repo.repositoryName,
            name: secret.name,
            key_id: key_id,
            encrypted_value: encodeSecret(key, value)
          });
        } catch (e) {
          vscode.window.showErrorMessage(e.message);
        }
      }
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
