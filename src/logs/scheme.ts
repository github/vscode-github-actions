import * as vscode from "vscode";
import {LogScheme} from "./constants";

/**
 * @param displayName Must not contain '/'
 */
export function buildLogURI(displayName: string, owner: string, repo: string, jobId: number): vscode.Uri {
  return vscode.Uri.parse(`${LogScheme}://${owner}/${repo}/${displayName}?${jobId}`);
}

export function parseUri(uri: vscode.Uri): {
  owner: string;
  repo: string;
  jobId: number;
  stepName?: string;
} {
  if (uri.scheme != LogScheme) {
    throw new Error("Uri is not of log scheme");
  }

  return {
    owner: uri.authority,
    repo: uri.path.split("/").slice(0, 2).join(""),
    jobId: parseInt(uri.query, 10),
    stepName: uri.fragment
  };
}
