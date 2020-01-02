import * as vscode from "vscode";
import { getPAT } from "../auth/pat";
import { getGitHubProtocol } from "../git/repository";
import {
  RunsResponse,
  Workflow,
  WorkflowRun,
  WorkflowsResponse
} from "../model";
import { OctokitWithActions } from "../typings/api";
import { getIconForWorkflowRun } from "./icons";
import { getClient } from "../api/api";

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
    public readonly wf: Workflow,
    private client: OctokitWithActions
  ) {
    super(wf.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "workflow";
  }

  async getRuns(): Promise<WorkflowRunNode[]> {
    const result = await this.client.request(`${this.wf.url}/runs`);
    const resp = result.data as RunsResponse;

    return resp.workflow_runs.map(wr => new WorkflowRunNode(wr));
  }
}

class WorkflowRunNode extends vscode.TreeItem {
  constructor(public readonly run: WorkflowRun) {
    super(`#${run.id}`);

    this.description = `${run.event} (${(run.after || "").substr(0, 7)})`;

    this.command = {
      title: "Open run",
      command: "explorer.openRun"
      // arguments: run.url // TODO: use `html_url` once run has it
    };
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
        const result = await client.actions.listWorkflows({
          owner: repo.owner,
          repo: repo.repositoryName
        });
        const response = result.data as WorkflowsResponse;
        return response.workflows.map(wf => new WorkflowNode(wf, client));
      } catch (e) {
        vscode.window.showErrorMessage(
          `:( An error has occured while retrieving workflows:\n\n${e.message}`
        );

        return [new ErrorNode("An error has occured :(")];
      }
    }
  }
}
