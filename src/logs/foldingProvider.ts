import * as vscode from "vscode";

export class WorkflowStepLogFoldingProvider
  implements vscode.FoldingRangeProvider {
  provideFoldingRanges(
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    let firstRange: vscode.FoldingRange | null = new vscode.FoldingRange(
      0,
      1,
      vscode.FoldingRangeKind.Region
    );

    // Assume there is always the setup range
    const ranges: vscode.FoldingRange[] = [firstRange];

    let currentRange: vscode.FoldingRange | null = null;
    const log = document.getText();
    const lines = log.split(/\n|\r/).filter(l => !!l);
    lines.forEach((line, idx) => {
      if (line.indexOf("##[group]") !== -1) {
        // If this is the first group marker we encounter, the previous range was the job setup
        if (firstRange) {
          firstRange.end = idx - 1;
          firstRange = null;
        }

        currentRange = new vscode.FoldingRange(
          idx,
          idx + 1,
          vscode.FoldingRangeKind.Region
        );
      } else if (line.indexOf("##[endgroup]") !== -1) {
        if (!currentRange) {
          throw new Error("Found ##[endgroup] marker without group begin");
        }

        currentRange.end = idx;
        ranges.push(currentRange);
        currentRange = null;
      }
    });

    return ranges;
  }
}
