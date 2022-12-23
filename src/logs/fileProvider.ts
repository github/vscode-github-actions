import {OctokitResponse} from "@octokit/types";
import * as vscode from "vscode";
import {getGitHubContextForRepo} from "../git/repository";
import {cacheLogInfo} from "./logInfo";
import {parseLog} from "./model";
import {parseUri} from "./scheme";

export class WorkflowStepLogProvider implements vscode.TextDocumentContentProvider {
  onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const {owner, repo, jobId} = parseUri(uri);

    const githubRepoContext = await getGitHubContextForRepo(owner, repo);
    if (!githubRepoContext) {
      throw new Error("Could not load logs");
    }

    try {
      const result = await githubRepoContext?.client.actions.downloadJobLogsForWorkflowRun({
        owner: owner,
        repo: repo,
        job_id: jobId
      });

      const log = result.data;

      const logInfo = parseLog(log as string);
      cacheLogInfo(uri, logInfo);

      return logInfo.updatedLogLines.join("\n");
    } catch (e) {
      const respErr = e as OctokitResponse<unknown, number>;
      if (respErr.status === 410) {
        cacheLogInfo(uri, {
          sections: [],
          updatedLogLines: [],
          styleFormats: []
        });

        return "Could not open logs, they are expired.";
      }

      console.error("Error loading logs", e);
      return `Could not open logs, unhandled error. ${(e as Error).message}`;
    }
  }
}
