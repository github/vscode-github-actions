import * as vscode from 'vscode';
import {WorkflowRun} from '../model';

interface OpenWorkflowRunCommandArgs {
  run: WorkflowRun;
}

export function registerOpenWorkflowRun(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('github-actions.workflow.run.open', async (args: OpenWorkflowRunCommandArgs) => {
      const run = args.run;
      const url = run.html_url;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );
}
