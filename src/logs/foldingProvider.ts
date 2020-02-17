import * as vscode from "vscode";
import { parseLog } from "./model";

export class WorkflowStepLogFoldingProvider
  implements vscode.FoldingRangeProvider {
  provideFoldingRanges(
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    const log = document.getText();
    const logInfo = parseLog(log);

    return logInfo.sections.map(
      s =>
        new vscode.FoldingRange(s.start, s.end, vscode.FoldingRangeKind.Region)
    );
  }
}
