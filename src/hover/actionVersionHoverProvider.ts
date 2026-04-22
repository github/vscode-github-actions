import * as vscode from "vscode";

import {parseUsesReference, fetchLatestVersion} from "./actionVersionUtils";

export class ActionVersionHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const line = document.lineAt(position).text;
    const ref = parseUsesReference(line);
    if (!ref) {
      return undefined;
    }

    // Ensure cursor is within the action reference range
    if (position.character < ref.valueStart || position.character > ref.valueEnd) {
      return undefined;
    }

    if (token.isCancellationRequested) {
      return undefined;
    }

    const versionInfo = await fetchLatestVersion(ref.owner, ref.name);
    if (!versionInfo || token.isCancellationRequested) {
      return undefined;
    }

    const md = new vscode.MarkdownString();

    const isCurrentLatest = ref.currentRef === versionInfo.latest || ref.currentRef === versionInfo.latestMajor;

    if (isCurrentLatest) {
      md.appendMarkdown(`**Latest version:** \`${versionInfo.latest}\` ✓`);
    } else {
      md.appendMarkdown(`**Latest version:** \`${versionInfo.latest}\``);
      if (versionInfo.latestMajor && ref.currentRef !== versionInfo.latestMajor) {
        md.appendMarkdown(` (major: \`${versionInfo.latestMajor}\`)`);
      }
    }

    const range = new vscode.Range(position.line, ref.valueStart, position.line, ref.valueEnd);

    return new vscode.Hover(md, range);
  }
}
