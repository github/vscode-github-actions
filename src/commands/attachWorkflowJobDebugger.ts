import * as vscode from "vscode";
import {WorkflowJobNode} from "../treeViews/shared/workflowJobNode";
import {getGitHubContext} from "../git/repository";

export type AttachWorkflowJobDebuggerArgs = Pick<WorkflowJobNode, "gitHubRepoContext" | "job">;

export function registerAttachWorkflowJobDebugger(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.workflow.job.attachDebugger",
      async (args: AttachWorkflowJobDebuggerArgs) => {
        const job = args.job.job;
        const repoContext = args.gitHubRepoContext;
        const workflowName = job.workflow_name || undefined;
        const jobName = job.name;
        const title = workflowName ? `Workflow "${workflowName}" job "${jobName}"` : `Job "${jobName}"`;

        // Get current GitHub user
        const gitHubContext = await getGitHubContext();
        const username = gitHubContext?.username || "unknown";

        const debugConfig: vscode.DebugConfiguration = {
          name: `GitHub Actions: ${title}`,
          type: "github-actions",
          request: "attach",
          workflowName,
          jobName,
          // Identity fields for DAP proxy audit logging
          githubActor: username,
          githubRepository: `${repoContext.owner}/${repoContext.name}`,
          githubRunID: String(job.run_id),
          githubJobID: String(job.id)
        };

        const folder = vscode.workspace.workspaceFolders?.[0];
        const started = await vscode.debug.startDebugging(folder, debugConfig);
        if (!started) {
          await vscode.window.showErrorMessage("Failed to start GitHub Actions debug session.");
        }
      }
    )
  );
}
