import * as vscode from "vscode";
import { getClient } from "../api/api";
import { getPAT } from "../auth/pat";
import { Protocol } from "../external/protocol";
import { getGitHubProtocol } from "../git/repository";
import { Workflow, WorkflowRun } from "../model";
import { getWorkflowUri, usesRepositoryDispatch } from "../workflow/workflow";
import { getIconForWorkflowRun } from "./icons";
import Octokit = require("@octokit/rest");

class NoGitHubRepositoryNode extends vscode.TreeItem {
  constructor() {
    super("Current workspace does not contain a github.com repository");
  }
}

class AuthenticationNode extends vscode.TreeItem {
  constructor() {
    super("No PAT for GitHub found. Click here to login.");

    this.command = {
      title: "Login",
      command: "auth.login"
    };
  }
}

class ErrorNode extends vscode.TreeItem {
  constructor(message: string) {
    super(message);
  }
}

class WorkflowNode extends vscode.TreeItem {
  constructor(
    public readonly repo: Protocol,
    public readonly wf: Workflow,
    public readonly client: Octokit
  ) {
    super(wf.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "workflow";

    const workflowUri = getWorkflowUri(wf.path);
    if (workflowUri) {
      if (usesRepositoryDispatch(workflowUri.fsPath)) {
        this.contextValue += "rdispatch";
      }
    }
  }

  async getRuns(): Promise<WorkflowRunNode[]> {
    const result = await this.client.actions.listWorkflowRuns({
      owner: this.repo.owner,
      repo: this.repo.repositoryName,
      workflow_id: this.wf.id
    });

    const resp = result.data;
    const runs = resp.workflow_runs;

    return runs.map(
      wr => new WorkflowRunNode(this.repo, this.wf, wr as any, this.client)
    );
  }
}

class WorkflowRunNode extends vscode.TreeItem {
  constructor(
    public readonly repo: Protocol,
    public readonly workflow: Workflow,
    public readonly run: WorkflowRun,
    public readonly client: Octokit
  ) {
    super(`#${run.id}`);

    this.description = `${run.event} (${(run.head_sha || "").substr(0, 7)})`;

    this.contextValue = "run";
    if (this.run.status !== "completed") {
      this.contextValue += " cancelable";
    }

    if (this.run.status === "completed" && this.run.conclusion !== "success") {
      this.contextValue += " rerunnable";
    }

    this.command = {
      title: "Open run",
      command: "workflow.run.open"
    };
  }

  get tooltip(): string {
    return `${this.run.status} - ${this.run.conclusion}`;
  }

  get iconPath(): string {
    return getIconForWorkflowRun(this.run);
  }
}

type ActionsExplorerNode =
  | AuthenticationNode
  | NoGitHubRepositoryNode
  | WorkflowNode
  | WorkflowRunNode;

export class ActionsExplorerProvider
  implements vscode.TreeDataProvider<ActionsExplorerNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ActionsExplorerNode>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(
    element: ActionsExplorerNode
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(
    element?: ActionsExplorerNode | undefined
  ): Promise<ActionsExplorerNode[]> {
    if (element && element instanceof WorkflowNode) {
      return element.getRuns();
    } else {
      // Root nodes
      const repo = await getGitHubProtocol();
      if (!repo) {
        return [new NoGitHubRepositoryNode()];
      }

      // Get token
      const token = await getPAT();
      if (!token) {
        return [new AuthenticationNode()];
      }

      try {
        const client = getClient(token);
        const result = await client.actions.listRepoWorkflows({
          owner: repo.owner,
          repo: repo.repositoryName
        });
        const response = result.data;

        const workflows = response.workflows;
        workflows.sort((a, b) => a.name.localeCompare(b.name));

        return workflows.map(wf => new WorkflowNode(repo, wf, client));
      } catch (e) {
        vscode.window.showErrorMessage(
          `:( An error has occured while retrieving workflows:\n\n${e.message}`
        );

        return [new ErrorNode("An error has occured :(")];
      }
    }
  }
}
