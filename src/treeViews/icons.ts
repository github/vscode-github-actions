import * as vscode from "vscode";
import { WorkflowRun, WorkflowJob } from "../model";

let _context: vscode.ExtensionContext;
export function initResources(context: vscode.ExtensionContext) {
  _context = context;
}

export function getAbsoluteIconPath(
  relativeIconPath: string
): { light: string | vscode.Uri; dark: string | vscode.Uri } {
  return {
    light: _context.asAbsolutePath(`resources/icons/light/${relativeIconPath}`),
    dark: _context.asAbsolutePath(`resources/icons/dark/${relativeIconPath}`)
  };
}

export function getIconForWorkflowRun(runOrJob: WorkflowRun | WorkflowJob) {
  return getAbsoluteIconPath(_getIconForWorkflowrun(runOrJob));
}

function _getIconForWorkflowrun(runOrJob: WorkflowRun | WorkflowJob): string {
  switch (runOrJob.status) {
    case "completed": {
      switch (runOrJob.conclusion) {
        case "success":
          return "conclusions/success.svg";

        case "failure":
          return "conclusions/failure.svg";

        case "cancelled":
          return "conclusions/cancelled.svg";
      }
    }

    case "queued":
      return "statuses/queued.svg";

    case "inprogress":
    case "in_progress":
      return "statuses/in-progress.svg";
  }

  return "";
}
