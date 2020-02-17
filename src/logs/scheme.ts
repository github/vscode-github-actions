import * as vscode from "vscode";
import { LogScheme } from "./constants";

export function buildLogURI(
  owner: string,
  repo: string,
  jobId: number
): vscode.Uri {
  return vscode.Uri.parse(`${LogScheme}://${owner}/${repo}#${jobId}`);
}

export function parseUri(
  uri: vscode.Uri
): { owner: string; repo: string; jobId: number } {
  if (uri.scheme != LogScheme) {
    throw new Error("Uri is not of log scheme");
  }

  return {
    owner: uri.authority,
    repo: uri.path.replace("/", ""),
    jobId: parseInt(uri.fragment, 10)
  };
}
