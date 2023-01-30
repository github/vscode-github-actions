import * as vscode from "vscode";

let _context: vscode.ExtensionContext;
export function initResources(context: vscode.ExtensionContext) {
  _context = context;
}

export interface StatusAndConclusion {
  status: string | null;
  conclusion: string | null;
}

export function getAbsoluteIconPath(relativeIconPath: string): {
  light: string | vscode.Uri;
  dark: string | vscode.Uri;
} {
  return {
    light: _context.asAbsolutePath(`resources/icons/light/${relativeIconPath}`),
    dark: _context.asAbsolutePath(`resources/icons/dark/${relativeIconPath}`)
  };
}

export function getIconForWorkflowRun({
  status,
  conclusion
}: StatusAndConclusion): string | vscode.ThemeIcon | {light: string | vscode.Uri; dark: string | vscode.Uri} {
  switch (status) {
    case "completed": {
      switch (conclusion) {
        case "success":
          return getAbsoluteIconPath("workflowruns/wr_success.svg");

        case "failure":
          return getAbsoluteIconPath("workflowruns/wr_failure.svg");

        case "skipped":
          return getAbsoluteIconPath("workflowruns/wr_skipped.svg");

        case "cancelled":
          return getAbsoluteIconPath("workflowruns/wr_cancelled.svg");
      }

      break;
    }

    case "pending":
      return getAbsoluteIconPath("workflowruns/wr_pending.svg");

    case "requested":
    case "queued":
      return getAbsoluteIconPath("workflowruns/wr_queued.svg");

    case "waiting":
      return getAbsoluteIconPath("workflowruns/wr_waiting.svg");

    case "inprogress":
    case "in_progress":
      return getAbsoluteIconPath("workflowruns/wr_inprogress.svg");
  }

  return "";
}

export function getIconForWorkflowStep({
  status,
  conclusion
}: StatusAndConclusion): string | vscode.ThemeIcon | {light: string | vscode.Uri; dark: string | vscode.Uri} {
  switch (status) {
    case "completed": {
      switch (conclusion) {
        case "success":
          return getAbsoluteIconPath("steps/step_success.svg");

        case "failure":
          return getAbsoluteIconPath("steps/step_failure.svg");

        case "skipped":
          return getAbsoluteIconPath("steps/step_skipped.svg");

        case "cancelled":
          return getAbsoluteIconPath("steps/step_cancelled.svg");
      }

      break;
    }

    case "queued":
      return getAbsoluteIconPath("steps/step_queued.svg");

    case "inprogress":
    case "in_progress":
      return getAbsoluteIconPath("steps/step_inprogress.svg");
  }

  return "";
}

/** Get one of the built-in VS Code icons */
export function getCodIconForWorkflowRun(runOrJob?: StatusAndConclusion): string {
  if (!runOrJob) {
    return "circle-outline";
  }

  switch (runOrJob.status) {
    case "completed": {
      switch (runOrJob.conclusion) {
        case "success":
          return "pass";

        case "failure":
          return "error";

        case "skipped":
        case "cancelled":
          return "circle-slash";
      }
      break;
    }

    case "queued":
      return "primitive-dot";

    case "waiting":
      return "bell";

    case "inprogress":
    case "in_progress":
      return "sync~spin";
  }

  // Default to circle if there is no match
  return "circle";
}
