import * as vscode from "vscode";
import {WorkflowJob, WorkflowStep} from "../model";

export interface WorkflowStepCommandArgs {
  job: WorkflowJob;
  step: WorkflowStep;
}

// export type WorkflowStepCommandArgs = Pick<WorkflowJobNode, "job">;

export function registerOpenWorkflowStepLogs(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.step.logs", async (args: WorkflowStepCommandArgs) => {
      const job = args.job.job;
      let url = job.html_url ?? "";
      const stepName = args.step.name;

      const index = job.steps && job.steps.findIndex(step => step.name === stepName) + 1;

      if (url && index) {
        url = url + "#step:" + index.toString() + ":1";
      }

      await vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );
}
