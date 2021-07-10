import { extname } from "path";
import * as vscode from "vscode";
import { getContextStringForWorkflow } from "../workflow/workflow";

export function initWorkflowDocumentTracking(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor)
  );

  // Check for initial document
  onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
}

function onDidChangeActiveTextEditor(editor?: vscode.TextEditor) {
  if (!editor || !isTextEditor(editor)) {
    return;
  }

  // Check if the file is saved and could be a workflow
  if (
    !editor.document.uri?.fsPath ||
    editor.document.uri.scheme !== "file" ||
    (extname(editor.document.fileName) !== ".yaml" &&
      extname(editor.document.fileName) !== ".yml") ||
    editor.document.fileName.indexOf(".github/workflows") === -1
  ) {
    return;
  }

  vscode.commands.executeCommand(
    "setContext",
    "githubActions:activeFile",
    getContextStringForWorkflow(editor.document.fileName)
  );
}

// Adapted from from https://github.com/eamodio/vscode-gitlens/blob/f22a9cd4199ac498c217643282a6a412e1fc01ae/src/constants.ts#L74
enum DocumentSchemes {
  DebugConsole = "debug",
  Output = "output",
}

function isTextEditor(editor: vscode.TextEditor): boolean {
  const scheme = editor.document.uri.scheme;
  return (
    scheme !== DocumentSchemes.Output && scheme !== DocumentSchemes.DebugConsole
  );
}
