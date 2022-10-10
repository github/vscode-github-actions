import * as vscode from "vscode";

import { complete, hover, parse } from "github-actions-parser";

import { getGitHubContextForDocumentUri } from "../git/repository";

const WorkflowSelector = {
  pattern: "**/.github/workflows/*.{yaml,yml}",
};

export function init(context: vscode.ExtensionContext) {
  // Register auto-complete
  vscode.languages.registerCompletionItemProvider(WorkflowSelector, new WorkflowCompletionItemProvider(), ".");

  vscode.languages.registerHoverProvider(WorkflowSelector, new WorkflowHoverProvider());

  //
  // Provide diagnostics information
  //
  const collection = vscode.languages.createDiagnosticCollection("github-actions");
  if (vscode.window.activeTextEditor) {
    updateDiagnostics(vscode.window.activeTextEditor.document, collection);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDiagnostics(editor.document, collection);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => updateDiagnostics(e.document, collection)),
  );

  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri)));
}

async function updateDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
): Promise<void> {
  if (document && document.fileName.match("(.*)?.github/workflows/(.*).ya?ml")) {
    collection.clear();

    const gitHubRepoContext = await getGitHubContextForDocumentUri(document.uri);
    if (!gitHubRepoContext) {
      return;
    }

    const result = await parse(
      {
        ...gitHubRepoContext,
        repository: gitHubRepoContext.name,
      },
      document.uri.fsPath,
      document.getText(),
    );
    if (result.diagnostics.length > 0) {
      collection.set(
        document.uri,
        result.diagnostics.map((x) => ({
          severity: vscode.DiagnosticSeverity.Error,
          message: x.message,
          range: new vscode.Range(document.positionAt(x.pos[0]), document.positionAt(x.pos[1])),
        })),
      );
    }
  } else {
    collection.clear();
  }
}

export class WorkflowHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<null | vscode.Hover> {
    try {
      const gitHubRepoContext = await getGitHubContextForDocumentUri(document.uri);
      if (!gitHubRepoContext) {
        return null;
      }

      const hoverResult = await hover(
        {
          ...gitHubRepoContext,
          repository: gitHubRepoContext.name,
        },
        document.uri.fsPath,
        document.getText(),
        document.offsetAt(position),
      );

      if (hoverResult?.description) {
        return {
          contents: [hoverResult?.description],
        };
      }
    } catch (e) {
      // TODO: CS: handle
      debugger;
    }

    return null;
  }
}

export class WorkflowCompletionItemProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    cancellationToken: vscode.CancellationToken,
  ): Promise<vscode.CompletionItem[]> {
    try {
      const gitHubRepoContext = await getGitHubContextForDocumentUri(document.uri);
      if (!gitHubRepoContext) {
        return [];
      }

      const completionResult = await complete(
        {
          ...gitHubRepoContext,
          repository: gitHubRepoContext.name,
        },
        document.uri.fsPath,
        document.getText(),
        document.offsetAt(position),
      );

      if (completionResult.length > 0) {
        return completionResult.map((x) => {
          const completionItem = new vscode.CompletionItem(x.value, vscode.CompletionItemKind.Constant);

          // Fix the replacement range. By default VS Code looks for the current word, which leads to duplicate
          // replacements for something like `runs-|` which auto-completes to `runs-runs-on`
          const text = document.getText(
            new vscode.Range(
              position.line,
              Math.max(0, position.character - x.value.length),
              position.line,
              position.character,
            ),
          );
          for (let i = x.value.length; i >= 0; --i) {
            if (text.endsWith(x.value.substr(0, i))) {
              completionItem.range = new vscode.Range(
                position.line,
                Math.max(0, position.character - i),
                position.line,
                position.character,
              );
              break;
            }
          }

          if (x.description) {
            completionItem.documentation = new vscode.MarkdownString(x.description);
          }

          return completionItem;
        });
      }
    } catch (e) {
      // Ignore error
      return [];
    }

    return [];
  }
}
