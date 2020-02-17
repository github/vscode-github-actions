import * as vscode from "vscode";

let _context: vscode.ExtensionContext;
export function initResources(context: vscode.ExtensionContext) {
  _context = context;
}

export interface IStatusAndConclusion {
  status: string;
  conclusion: string;
}

export function getAbsoluteIconPath(
  relativeIconPath: string
): { light: string | vscode.Uri; dark: string | vscode.Uri } {
  return {
    light: _context.asAbsolutePath(`resources/icons/light/${relativeIconPath}`),
    dark: _context.asAbsolutePath(`resources/icons/dark/${relativeIconPath}`)
  };
}

export function getIconForWorkflowRun(runOrJob: IStatusAndConclusion) {
  return getAbsoluteIconPath(_getIconForWorkflowrun(runOrJob));
}

function _getIconForWorkflowrun(runOrJob: IStatusAndConclusion): string {
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
