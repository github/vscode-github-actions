import * as vscode from "vscode";
import { parseLog } from "./model";

export class WorkflowStepLogSymbolProvider
  implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<
    vscode.SymbolInformation[] | vscode.DocumentSymbol[]
  > {
    const log = document.getText();
    const logInfo = parseLog(log);

    return logInfo.sections.map(
      s =>
        new vscode.DocumentSymbol(
          s.name || "Setup",
          "Step",
          vscode.SymbolKind.Function,
          new vscode.Range(s.start, 0, s.end, 0),
          new vscode.Range(s.start, 0, s.end, 0)
        )
    );
  }
}
