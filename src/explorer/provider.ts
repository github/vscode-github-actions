import * as vscode from "vscode";
import Octokit = require("@octokit/rest");
import { WorkflowsResponse, Workflow, RunsResponse, WorkflowRun } from "../model";
import { token } from "../token";
import { getIconForWorkflowRun } from "./icons";

class WorkflowNode extends vscode.TreeItem {
    constructor(public readonly wf: Workflow, private client: Octokit) {
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
            command: "explorer.openRun",
            // arguments: run.url // TODO: use `html_url` once run has it
        };
    }

    get iconPath(): string {
        return getIconForWorkflowRun(this.run);
    }
}

type ActionsExplorerNode = WorkflowNode | WorkflowRunNode;

export class ActionsExplorerProvider implements vscode.TreeDataProvider<ActionsExplorerNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ActionsExplorerNode>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private client: Octokit;

    constructor() {
        this.client = new Octokit({
            auth: token,
            userAgent: "VS Code GitHub Actions",
            previews: ["jane-hopper"]
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ActionsExplorerNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: ActionsExplorerNode | undefined): Promise<ActionsExplorerNode[]> {

        if (element && element instanceof WorkflowNode) {
            return element.getRuns();
        } else {
            const result = await this.client.request("http://api.github.com/repos/bbq-beets/cschleiden-test/actions/workflows");
            const response = result.data as WorkflowsResponse;
            return response.workflows.map(wf => new WorkflowNode(wf, this.client));
        }
    }
}