import * as vscode from "vscode";
import { WorkflowRun } from "../model";

let _context: vscode.ExtensionContext;
export function initResources(context: vscode.ExtensionContext) {
    _context = context;
}

export function getIconForWorkflowRun(run: WorkflowRun): string {
    return _context.asAbsolutePath(_getIconForWorkflowrun(run));
}

function _getIconForWorkflowrun(run: WorkflowRun): string {
    switch (run.status) {
        case "completed": {
            switch (run.conclusion) {
                case "success":
                    return "resources/icons/dark/conclusions/success.svg";

                case "failure":
                    return "resources/icons/dark/conclusions/failure.svg";
            }
        }

        case "queued":
            return "resources/icons/dark/statuses/queued.svg";

        case "inprogress":
            return "resources/icons/dark/statuses/in-progress.svg";
    }

    return "";
}