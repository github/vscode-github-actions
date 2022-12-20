import * as vscode from "vscode";

/**
 * When no github.com remote can be found in the current workspace.
 */
export class NoWorkflowJobsNode extends vscode.TreeItem {
  constructor() {
    super("No workflow jobs");
  }
}
