import * as vscode from "vscode";
import {GitHubRepoContext} from "../../git/repository";
import {WorkflowStep} from "../../model";
import {WorkflowJob} from "../../store/workflowRun";
import {getIconForWorkflowRun} from "../icons";

export class WorkflowStepNode extends vscode.TreeItem {
  constructor(
    public readonly gitHubRepoContext: GitHubRepoContext,
    public readonly job: WorkflowJob,
    public readonly step: WorkflowStep
  ) {
    super(step.name);

    this.contextValue = "step";
    if (this.step.status === "completed") {
      this.contextValue += " completed";
    }

    this.command = {
      title: "Open run",
      command: "github-actions.workflow.logs",
      arguments: [this]
    };

    this.iconPath = getIconForWorkflowRun(this.step);
  }
}
