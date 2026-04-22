import * as vscode from "vscode";

import {WorkflowDebugFileSystemProvider} from "./workflowDebugFileSystemProvider";

export const WorkflowDebugScheme = "github-actions-debug";

export function registerWorkflowDebugProviders(context: vscode.ExtensionContext): void {
  const fsProvider = new WorkflowDebugFileSystemProvider(WorkflowDebugScheme);
  context.subscriptions.push(fsProvider);
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(WorkflowDebugScheme, fsProvider, {isCaseSensitive: true})
  );

  const treeProvider = new WorkflowDebugTreeProvider(WorkflowDebugScheme, fsProvider);
  context.subscriptions.push(vscode.window.registerTreeDataProvider("github-actions.workflow-debug", treeProvider));
}

class WorkflowDebugTreeProvider implements vscode.TreeDataProvider<WorkflowDebugNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<WorkflowDebugNode | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
  private readonly rootUri: vscode.Uri;
  private watchDisposable: vscode.Disposable | undefined;

  constructor(private readonly scheme: string, private readonly fileSystemProvider: WorkflowDebugFileSystemProvider) {
    this.rootUri = vscode.Uri.from({scheme: this.scheme, path: "/"});
    this.fileSystemProvider.onDidChangeFile(() => this.refresh());
    vscode.debug.onDidStartDebugSession(session => {
      if (session.type === "github-actions") {
        this.startRootWatch();
        this.refresh();
      }
    });
    vscode.debug.onDidTerminateDebugSession(session => {
      if (session.type === "github-actions") {
        this.stopRootWatch();
        this.refresh();
      }
    });

    if (vscode.debug.activeDebugSession?.type === "github-actions") {
      this.startRootWatch();
    }
  }

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: WorkflowDebugNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: WorkflowDebugNode): Promise<WorkflowDebugNode[]> {
    if (!element) {
      const root = new WorkflowDebugNode(
        getRootLabel(),
        vscode.TreeItemCollapsibleState.Expanded,
        this.rootUri,
        "root"
      );
      return [root];
    }

    if (element.type !== vscode.FileType.Directory) {
      return [];
    }

    try {
      const entries = await vscode.workspace.fs.readDirectory(element.resourceUri!);
      return entries.map(([name, type]) => {
        const childUri = vscode.Uri.joinPath(element.resourceUri!, name);
        return new WorkflowDebugNode(
          name,
          type === vscode.FileType.Directory
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          childUri,
          type === vscode.FileType.Directory ? "directory" : "file",
          type
        );
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Remote filesystem unavailable";
      return [
        new WorkflowDebugNode(
          message,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          "message",
          vscode.FileType.Unknown
        )
      ];
    }
  }

  private startRootWatch(): void {
    if (this.watchDisposable) {
      return;
    }

    this.watchDisposable = this.fileSystemProvider.watch(this.rootUri, {recursive: true});
  }

  private stopRootWatch(): void {
    if (!this.watchDisposable) {
      return;
    }

    this.watchDisposable.dispose();
    this.watchDisposable = undefined;
  }
}

function getRootLabel(): string {
  const session = vscode.debug.activeDebugSession;
  if (!session || session.type !== "github-actions") {
    return "Workflow Debug";
  }

  const workflowName =
    typeof session.configuration?.workflowName === "string" ? session.configuration.workflowName : undefined;
  const jobName = typeof session.configuration?.jobName === "string" ? session.configuration.jobName : undefined;

  if (!workflowName && !jobName) {
    return "Workflow Job";
  } else if (!workflowName) {
    return `Job '${jobName ?? "Unknown"}'`;
  } else {
    return `Workflow '${workflowName}' job '${jobName ?? "Unknown"}'`;
  }
}

class WorkflowDebugNode extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    uri?: vscode.Uri,
    contextValue?: string,
    readonly type: vscode.FileType = vscode.FileType.Directory
  ) {
    super(label, collapsibleState);
    this.resourceUri = uri;
    this.contextValue = contextValue;
    if (this.type === vscode.FileType.File && this.resourceUri) {
      this.command = {
        command: "vscode.open",
        title: "Open Remote File",
        arguments: [this.resourceUri]
      };
    }
  }
}
