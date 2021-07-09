import * as vscode from "vscode";

export class WorkflowStepLogProvider
  implements vscode.TextDocumentContentProvider
{
  onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    // const { owner, repo, jobId } = parseUri(uri);

    // const githubContext = await getGitHubContext();
    // if (!githubContext) {
    //   throw new Error("Could not load logs");
    // }

    // try {
    //   const result = await githubContext?.client.actions.downloadJobLogsForWorkflowRun(
    //     {
    //       owner: owner,
    //       repo: repo,
    //       job_id: jobId,
    //     }
    //   );

    //   const log = result.data as any;

    //   const logInfo = parseLog(log);
    //   cacheLogInfo(uri, logInfo);

    //   return logInfo.updatedLog;
    // } catch (e) {
    //   if ("status" in e && e.status === 410) {
    //     cacheLogInfo(uri, {
    //       colorFormats: [],
    //       sections: [],
    //       updatedLog: "",
    //     });

    //     return "Could not open logs, they are expired.";
    //   }

    //   console.error("Error loading logs", e);
    //   return `Could not open logs, unhandled error: ${e?.message || e}`;
    // }

    return "IMPLEMENT ME";
  }
}
