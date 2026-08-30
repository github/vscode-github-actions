import * as vscode from "vscode";
import {toDiagnosticAnnotation} from "../annotations/workflowRunAnnotations";
import {WorkflowRunCommandArgs} from "../treeViews/shared/workflowRunNode";

const diagnostics = vscode.languages.createDiagnosticCollection("github-actions");

export function registerImportWorkflowRunAnnotations(context: vscode.ExtensionContext) {
  context.subscriptions.push(diagnostics);
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "github-actions.workflow.run.importAnnotations",
      async (args: WorkflowRunCommandArgs) => {
        const {gitHubRepoContext, run} = args;
        const annotations = await gitHubRepoContext.client.paginate(
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/annotations",
          {
            owner: gitHubRepoContext.owner,
            repo: gitHubRepoContext.name,
            run_id: run.run.id,
            per_page: 100
          }
        );

        const byUri = new Map<string, vscode.Diagnostic[]>();
        for (const annotation of annotations) {
          const diagnostic = toDiagnosticAnnotation(annotation);
          const range = new vscode.Range(
            new vscode.Position(Math.max(diagnostic.startLine - 1, 0), Math.max(diagnostic.startColumn - 1, 0)),
            new vscode.Position(Math.max(diagnostic.endLine - 1, 0), Math.max(diagnostic.endColumn - 1, 0))
          );
          const item = new vscode.Diagnostic(
            range,
            diagnostic.message,
            diagnostic.severity === "error"
              ? vscode.DiagnosticSeverity.Error
              : diagnostic.severity === "warning"
              ? vscode.DiagnosticSeverity.Warning
              : vscode.DiagnosticSeverity.Information
          );
          item.source = "GitHub Actions";
          const uri = vscode.Uri.joinPath(gitHubRepoContext.workspaceUri, diagnostic.path).toString();
          byUri.set(uri, [...(byUri.get(uri) ?? []), item]);
        }

        diagnostics.clear();
        for (const [uri, items] of byUri) {
          diagnostics.set(vscode.Uri.parse(uri), items);
        }
        void vscode.window.showInformationMessage(`Imported ${annotations.length} workflow run annotation(s).`);
      }
    )
  );
}
