import * as vscode from "vscode";

import { parse } from "github-actions-parser";
import { Workflow } from "github-actions-parser/dist/lib/workflow";
import { safeLoad } from "js-yaml";
import { basename } from "path";
import { GitHubRepoContext } from "../git/repository";

interface On {
  event: string;
  types?: string[];
  branches?: string[];
  schedule?: string[];
}

function getEvents(doc: any): On[] {
  let trigger: string | string[] | { [trigger: string]: any | undefined } = doc.on;

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
      })),
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
      }),
    );
  }

  return on;
}

export async function getContextStringForWorkflow(path: string): Promise<string> {
  try {
    const content = await vscode.workspace.fs.readFile(vscode.Uri.file(path));
    const file = Buffer.from(content).toString("utf8");
    const doc = safeLoad(file);
    if (doc) {
      let context = "";

      const events = getEvents(doc);
      if (events.some((t) => t.event.toLowerCase() === "repository_dispatch")) {
        context += "rdispatch";
      }

      if (events.some((t) => t.event.toLowerCase() === "workflow_dispatch")) {
        context += "wdispatch";
      }

      return context;
    }
  } catch (e) {
    // Ignore
  }

  return "";
}

/**
 * Try to get Uri to workflow in currently open workspace folders
 *
 * @param path Path for workflow. E.g., `.github/workflows/somebuild.yaml`
 */
export function getWorkflowUri(gitHubRepoContext: GitHubRepoContext, path: string): vscode.Uri | null {
  return vscode.Uri.joinPath(gitHubRepoContext.workspaceUri, path);
}

export async function parseWorkflow(
  uri: vscode.Uri,
  gitHubRepoContext: GitHubRepoContext,
): Promise<Workflow | undefined> {
  try {
    const b = await vscode.workspace.fs.readFile(uri);
    const workflowInput = Buffer.from(b).toString("utf-8");
    const doc = await parse(
      {
        ...gitHubRepoContext,
        repository: gitHubRepoContext.name,
      },
      basename(uri.fsPath),
      workflowInput,
    );
    return doc.workflow;
  } catch {
    // Ignore error here
  }

  return undefined;
}
