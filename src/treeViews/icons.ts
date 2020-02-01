import * as vscode from "vscode";
import { WorkflowRun } from "../model";

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

export function getIconForWorkflowRun(run: WorkflowRun) {
  return getAbsoluteIconPath(_getIconForWorkflowrun(run));
}

function _getIconForWorkflowrun(run: WorkflowRun): string {
  switch (run.status) {
    case "completed": {
      switch (run.conclusion) {
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
