import * as vscode from "vscode";
import {GitHubRepoContext} from "../git/repository";
import {updateDecorations} from "../logs/formatProvider";
import {getLogInfo} from "../logs/logInfo";
import {buildLogURI} from "../logs/scheme";
import {WorkflowJob} from "../store/WorkflowJob";
import { WorkflowStep } from "../model";

export interface OpenWorkflowStepLogsCommandArgs {
  gitHubRepoContext: GitHubRepoContext;
  job: WorkflowJob;
  step: WorkflowStep;
}

export function registerOpenWorkflowStepLogs(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.step.logs", async (args: OpenWorkflowStepLogsCommandArgs) => {
      const gitHubRepoContext = args.gitHubRepoContext;
      const job = args.job;
      const step = args.step;

      const uri = buildLogURI(
        `%23${job.job.run_id} - ${job.job.name}`,
        gitHubRepoContext.owner,
        gitHubRepoContext.name,
        job.job.id
      );

      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, {
        preview: false
      });

      const logInfo = getLogInfo(uri);
      if (!logInfo) {
        throw new Error("Could not get log info");
      }

      const section = logInfo.sections.find(s => s.name === step.name);
      const startLine = section ? section.start : 0;
      const endLine = section ? section.end : 0;


      const stepInfo = {
        updatedLogLines: logInfo["updatedLogLines"].slice(startLine, endLine),
        sections: logInfo["sections"].filter(s => s.name === step.name),
        styleFormats: logInfo["styleFormats"].filter(s => s.line >= startLine && s.line <= endLine)
      };


      // Custom formatting after the editor has been opened
      updateDecorations(editor, stepInfo);
    })
  );
}