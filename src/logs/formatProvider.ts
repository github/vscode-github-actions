import * as vscode from "vscode";
import { LogScheme } from "./constants";

const errorDecorationType = vscode.window.createTextEditorDecorationType({
  color: new vscode.ThemeColor("editorError.foreground"),
  borderColor: new vscode.ThemeColor("editorError.border")
});

const groupDecorationType = vscode.window.createTextEditorDecorationType({
  fontWeight: "bold"
});

let activeEditor = vscode.window.activeTextEditor;
let timeout: NodeJS.Timer | undefined = undefined;

function updateDecorations() {
  if (!activeEditor) {
    return;
  }
  const regEx = /##\[error\]|##\[group\]/g;
  const text = activeEditor.document.getText();
  const errors: vscode.DecorationOptions[] = [];
  const groups: vscode.DecorationOptions[] = [];
  let match;
  while ((match = regEx.exec(text))) {
    const startPos = activeEditor.document.positionAt(match.index);
    const lineRange = activeEditor.document.lineAt(startPos.line).range;

    const decorationRange = {
      range: lineRange
    };
    if (match[0].indexOf("error") !== -1) {
      errors.push(decorationRange);
    } else {
      groups.push(decorationRange);
    }
  }

  activeEditor.setDecorations(errorDecorationType, errors);
  activeEditor.setDecorations(groupDecorationType, groups);
}

function triggerUpdateDecorations() {
  if (timeout) {
    clearTimeout(timeout);
    timeout = undefined;
  }
  timeout = setTimeout(updateDecorations, 500);
}

export function registerFormatProvider(context: vscode.ExtensionContext) {
  vscode.window.onDidChangeActiveTextEditor(
    editor => {
      activeEditor = editor;
      if (activeEditor && editor?.document.uri.scheme === LogScheme) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    event => {
      if (
        activeEditor &&
        event.document === activeEditor.document &&
        event.document.uri.scheme === LogScheme
      ) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );
}
