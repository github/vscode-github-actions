import * as vscode from "vscode";

import {parseUsesReference, fetchLatestVersion, isShaRef} from "./actionVersionUtils";

export class ActionVersionCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeAction[] | undefined> {
    const actions: vscode.CodeAction[] = [];

    for (let lineNum = range.start.line; lineNum <= range.end.line; lineNum++) {
      if (token.isCancellationRequested) {
        return actions.length > 0 ? actions : undefined;
      }

      const line = document.lineAt(lineNum).text;
      const ref = parseUsesReference(line);
      if (!ref) {
        continue;
      }

      // Don't offer to replace SHA-pinned refs — it would change the security posture
      if (isShaRef(ref.currentRef)) {
        continue;
      }

      if (token.isCancellationRequested) {
        return actions.length > 0 ? actions : undefined;
      }

      const versionInfo = await fetchLatestVersion(ref.owner, ref.name);
      if (!versionInfo) {
        continue;
      }

      const isCurrentLatest = ref.currentRef === versionInfo.latest || ref.currentRef === versionInfo.latestMajor;

      if (isCurrentLatest) {
        continue;
      }

      const refRange = new vscode.Range(lineNum, ref.refStart, lineNum, ref.refEnd);

      // Offer update to latest full version
      const updateToLatest = new vscode.CodeAction(
        `Update ${ref.actionPath} to ${versionInfo.latest}`,
        vscode.CodeActionKind.QuickFix
      );
      updateToLatest.edit = new vscode.WorkspaceEdit();
      updateToLatest.edit.replace(document.uri, refRange, versionInfo.latest);
      updateToLatest.isPreferred = true;
      actions.push(updateToLatest);

      // Offer update to latest major version tag if different
      if (
        versionInfo.latestMajor &&
        versionInfo.latestMajor !== versionInfo.latest &&
        versionInfo.latestMajor !== ref.currentRef
      ) {
        const updateToMajor = new vscode.CodeAction(
          `Update ${ref.actionPath} to ${versionInfo.latestMajor}`,
          vscode.CodeActionKind.QuickFix
        );
        updateToMajor.edit = new vscode.WorkspaceEdit();
        updateToMajor.edit.replace(document.uri, refRange, versionInfo.latestMajor);
        actions.push(updateToMajor);
      }
    }

    return actions.length > 0 ? actions : undefined;
  }
}
