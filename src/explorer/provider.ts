import * as vscode from "vscode";
import Octokit = require("@octokit/rest");
import { WorkflowsResponse, Workflow, RunsResponse, WorkflowRun } from "../model";
import { token } from "../token";

class ActionsExplorerNode extends vscode.TreeItem {
    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None) {
        super(label, collapsibleState);
    }
}

class WorkflowNode extends ActionsExplorerNode {
    constructor(public readonly wf: Workflow) {
        super(wf.name, vscode.TreeItemCollapsibleState.Collapsed);
    }
}

class WorkflowRunNode extends ActionsExplorerNode {
    constructor(public readonly run: WorkflowRun) {
        super(`${run.id} ${run.status} - ${run.conclusion}`);
    }
}

export class ActionsExplorerProvider implements vscode.TreeDataProvider<ActionsExplorerNode> {
    readonly onDidChangeTreeData?: vscode.Event<ActionsExplorerNode | null | undefined> | undefined;

    private client: Octokit;

    constructor() {
        this.client = new Octokit({
            auth: token,
            userAgent: "VS Code GitHub Actions",
            previews: ["jane-hopper"]
        });
    }

    refresh(): void {
    }

    getTreeItem(element: ActionsExplorerNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: ActionsExplorerNode | undefined): Promise<ActionsExplorerNode[]> {

        if (element && element instanceof WorkflowNode) {
            const result = await this.client.request(`${element.wf.url}/runs`);
            const resp = result.data as RunsResponse;

            return resp.workflow_runs.map(wr => new WorkflowRunNode(wr));
        } else {
            const result = await this.client.request("http://api.github.com/repos/bbq-beets/cschleiden-test/actions/workflows");
            const response = result.data as WorkflowsResponse;

            const children: ActionsExplorerNode[] = response.workflows.map(wf => new WorkflowNode(wf));
            return children;
        }
    }
}