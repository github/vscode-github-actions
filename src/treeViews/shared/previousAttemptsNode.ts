import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {WorkflowRun} from "../../store/workflowRun";
import {AttemptNode} from "./attemptNode";

export class PreviousAttemptsNode extends vscode.TreeItem {
  constructor(private gitHubRepoContext: GitHubRepoContext, private run: WorkflowRun) {
    super("Previous attempts", vscode.TreeItemCollapsibleState.Collapsed);
  }

  async getAttempts(): Promise<AttemptNode[]> {
    const attempts = await this.run.attempts();
    return attempts.map(attempt => new AttemptNode(this.gitHubRepoContext, attempt));
  }
}
