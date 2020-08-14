import * as vscode from "vscode";
import { getGitHubContext } from "../git/repository";
import { cacheLogInfo } from "./logInfoProvider";
import { parseLog } from "./model";
import { parseUri } from "./scheme";

export class WorkflowStepLogProvider
  implements vscode.TextDocumentContentProvider {
  onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const { owner, repo, jobId } = parseUri(uri);

    const githubContext = await getGitHubContext();
    if (!githubContext) {
      throw new Error("Could not load logs");
    }

    const result = await githubContext?.client.actions.downloadJobLogsForWorkflowRun(
      {
        owner: owner,
        repo: repo,
        job_id: jobId,
      }
    );

    const log = result.data;

    const logInfo = parseLog(log);
    cacheLogInfo(uri, logInfo);

    return logInfo.updatedLog;
  }
}
