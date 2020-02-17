import * as vscode from "vscode";
import { LogScheme } from "./constants";

export function buildLogURI(
  owner: string,
  repo: string,
  jobId: number,
  stepName?: string
): vscode.Uri {
  return vscode.Uri.parse(
    `${LogScheme}://${owner}/${repo}?${jobId}#${stepName}`
  );
}

export function parseUri(
  uri: vscode.Uri
): { owner: string; repo: string; jobId: number; stepName?: string } {
  if (uri.scheme != LogScheme) {
    throw new Error("Uri is not of log scheme");
  }

  return {
    owner: uri.authority,
    repo: uri.path.replace("/", ""),
    jobId: parseInt(uri.query, 10),
    stepName: uri.fragment
  };
}
