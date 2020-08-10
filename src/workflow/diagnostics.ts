import { complete, hover, parse } from "github-actions-parser";
import * as vscode from "vscode";
import { getGitHubContext } from "../git/repository";

const WorkflowSelector = {
  pattern: "**/.github/workflows/*.{yaml,yml}",
};

export function init(context: vscode.ExtensionContext) {
  // Register auto-complete
  vscode.languages.registerCompletionItemProvider(
    WorkflowSelector,
    new WorkflowCompletionItemProvider(),
    "."
  );

  vscode.languages.registerHoverProvider(
    WorkflowSelector,
    new WorkflowHoverProvider()
  );

  //
  // Provide diagnostics information
  //
  const collection = vscode.languages.createDiagnosticCollection(
    "github-actions"
  );
  if (vscode.window.activeTextEditor) {
    updateDiagnostics(vscode.window.activeTextEditor.document, collection);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDiagnostics(editor.document, collection);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) =>
      updateDiagnostics(e.document, collection)
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri))
  );
}

async function updateDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
): Promise<void> {
  if (
    document &&
    document.fileName.match("(.*)?.github/workflows/(.*).ya?ml")
  ) {
    collection.clear();

    const githubContext = await getGitHubContext();
    if (!githubContext) {
      return;
    }

    const result = await parse(
      {
        ...githubContext,
        repository: githubContext.name,
      },
      vscode.workspace.asRelativePath(document.uri),
      document.getText()
    );

    if (result.diagnostics.length > 0) {
      collection.set(
        document.uri,
        result.diagnostics.map((x) => ({
          severity: vscode.DiagnosticSeverity.Error,
          message: x.message,
          range: new vscode.Range(
            document.positionAt(x.pos[0]),
            document.positionAt(x.pos[1])
          ),
        }))
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
    token: vscode.CancellationToken
  ): Promise<null | vscode.Hover> {
    try {
      const githubContext = await getGitHubContext();
      if (!githubContext) {
        return null;
      }

      const hoverResult = await hover(
        {
          ...githubContext,
          repository: githubContext.name,
        },
        vscode.workspace.asRelativePath(document.uri),
        document.getText(),
        document.offsetAt(position)
      );

      if (hoverResult?.description) {
        return {
          contents: [hoverResult?.description],
        };
      }
    } catch (e) {
      // TODO: CS: handle
    }

    return null;
  }
}

export class WorkflowCompletionItemProvider
  implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    cancellationToken: vscode.CancellationToken
  ): Promise<vscode.CompletionItem[]> {
    const linePrefix = document
      .lineAt(position)
      .text.substr(0, position.character);

    try {
      const githubContext = await getGitHubContext();
      if (!githubContext) {
        return [];
      }

      const start = Date.now();
      const completionResult = await complete(
        {
          ...githubContext,
          repository: githubContext.name,
        },
        vscode.workspace.asRelativePath(document.uri),
        document.getText(),
        document.offsetAt(position)
      );
      const time = Date.now() - start;
      console.log("Time", time);

      if (completionResult.length > 0) {
        return completionResult.map((x) => {
          const completionItem = new vscode.CompletionItem(
            x.value,
            vscode.CompletionItemKind.Constant
          );

          if (x.description) {
            completionItem.documentation = new vscode.MarkdownString(
              x.description
            );
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
