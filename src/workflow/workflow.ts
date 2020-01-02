import { safeLoad } from "js-yaml";
import { readFileSync } from "fs";
import * as vscode from "vscode";
import { join } from "path";

export function usesRepositoryDispatch(path: string): boolean {
  try {
    const doc = safeLoad(readFileSync(path, "utf8"));
    if (doc) {
      let trigger: string | string[] = doc.on;
      if (!Array.isArray(trigger)) {
        trigger = [trigger];
      }

      if (trigger.some(t => t.toLowerCase() === "repository_dispatch")) {
        // One of the triggers is repository dispatch, allow sending it
        return true;
      }
    }
  } catch (e) {
    // Ignore
  }

  return false;
}

/**
 * Try to get Uri to workflow in currently open workspace folders
 *
 * @param path Path for workflow. E.g., `.github/workflows/somebuild.yaml`
 */
export function getWorkflowUri(path: string): vscode.Uri | null {
  for (const workspaceFolder of vscode.workspace.workspaceFolders || []) {
    const fileUri = vscode.Uri.file(join(workspaceFolder.uri.fsPath, path));
    if (vscode.workspace.getWorkspaceFolder(fileUri)) {
      return fileUri;
    }
  }

  return null;
}
