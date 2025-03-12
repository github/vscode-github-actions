import * as vscode from "vscode";
import {match} from "ts-pattern";
import {type vscodeTestingThemeColor} from "./shared/vscodeThemeColor";
import {type vscodeTestingThemeIcon} from "./shared/vscodeThemeIcon";
import {logDebug} from "../log";

let _context: vscode.ExtensionContext;
export function initResources(context: vscode.ExtensionContext) {
  _context = context;
}

export interface StatusAndConclusion {
  status: string | null;
  conclusion: string | null;
}

export function getAbsoluteIconPath(relativeIconPath: string) {
  return {
    light: vscode.Uri.joinPath(_context.extensionUri, "resources", "icons", "light", relativeIconPath),
    dark: vscode.Uri.joinPath(_context.extensionUri, "resources", "icons", "dark", relativeIconPath)
  };
}

export function getIconForWorkflowNode(run: StatusAndConclusion): vscode.ThemeIcon {
  const iconInfo = match(run)
    .returnType<[vscodeTestingThemeIcon, vscodeTestingThemeColor]>()
    .with({status: "completed", conclusion: "success"}, () => ["testing-passed-icon", "testing.iconPassed"])
    .with({status: "completed", conclusion: "failure"}, () => ["testing-failed-icon", "testing.iconFailed"])
    .with({status: "completed", conclusion: "skipped"}, () => ["testing-skipped-icon", "testing.iconSkipped"])
    .with({status: "completed", conclusion: "cancelled"}, () => ["circle-slash", "testing.iconSkipped"])
    .with({status: "completed", conclusion: "action_required"}, () => ["warning", "testing.iconQueued"])
    .with({status: "completed", conclusion: "timed_out"}, () => ["warning", "testing.iconQueued"])
    .with({status: "completed", conclusion: "neutral"}, () => ["testing-passed-icon", "testing.iconSkipped"])
    .with({status: "queued"}, () => ["testing-queued-icon", "testing.iconQueued"])
    .with({status: "waiting"}, () => ["testing-queued-icon", "testing.iconQueued"])
    .with({status: "pending"}, () => ["testing-queued-icon", "testing.iconQueued"])
    .with({conclusion: "pending"}, () => ["testing-queued-icon", "testing.iconQueued"])
    .with({status: "in_progress"}, () => ["loading~spin", "testing.iconUnset"])
    .with({status: "inprogress"}, () => ["loading~spin", "testing.iconUnset"])
    .otherwise(() => {
      logDebug("Unknown status/conclusion combination: ", run.status, run.conclusion);
      return ["question", "testing.iconUnset"];
    });

  return new vscode.ThemeIcon(iconInfo[0], new vscode.ThemeColor(iconInfo[1]));
}

export function getCodIconForWorkflowRun(runOrJob?: StatusAndConclusion): string {
  if (!runOrJob) {
    return "circle-outline";
  }

  return getIconForWorkflowNode(runOrJob).id;
}
