import { readFileSync } from "fs";
import { safeLoad } from "js-yaml";
import { join } from "path";
import * as vscode from "vscode";

interface On {
  event: string;
  types?: string[];
  branches?: string[];
  schedule?: string[];
}

function getEvents(doc: any): On[] {
  let trigger: string | string[] | { [trigger: string]: any | undefined } =
    doc.on;

  const on: On[] = [];

  if (trigger == undefined) {
    return [];
  } else if (typeof trigger == "string") {
    on.push({
      event: trigger,
    });
  } else if (Array.isArray(trigger)) {
    on.push(
      ...trigger.map((t) => ({
        event: t,
      }))
    );
  } else if (typeof trigger == "object") {
    on.push(
      ...Object.keys(trigger).map((event) => {
        // Work around typing :(
        const t = (trigger as any)[event];

        return {
          event,
          types: t?.types,
          branches: t?.branches,
          schedule: t?.schedule,
        };
      })
    );
  }

  return on;
}

export function usesRepositoryDispatch(path: string): boolean {
  try {
    const doc = safeLoad(readFileSync(path, "utf8"));
    if (doc) {
      if (
        getEvents(doc).some(
          (t) => t.event.toLowerCase() === "repository_dispatch"
        )
      ) {
        // One of the triggers is repository dispatch, allow sending it
        return true;
      }
    }
  } catch (e) {
    // Ignore
  }

  return false;
}

export function getRepositoryDispatchTypes(path: string): string[] {
  try {
    const doc = safeLoad(readFileSync(path, "utf8"));
    if (doc) {
      const rdispatch = getEvents(doc).find(
        (t) => t.event.toLowerCase() == "repository_dispatch"
      );
      return rdispatch?.types || [];
    }
  } catch (e) {
    // Ignore
  }

  return [];
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
