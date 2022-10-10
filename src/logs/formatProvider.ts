import * as vscode from "vscode";
import { LogInfo } from "./model";

const timestampRE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{7}Z/;

const timestampDecorationType = vscode.window.createTextEditorDecorationType({
  color: "#99999959",
});

const background = {
  "40": "#0c0c0c",
  "41": "#e74856",
  "42": "#16c60c",
  "43": "#f9f1a5",
  "44": "#0037da",
  "45": "#881798",
  "46": "#3a96dd",
  "47": "#cccccc",
  "100": "#767676",
} as { [key: string]: string };

const foreground = {
  "30": "#0c0c0c",
  "31": "#e74856",
  "32": "#16c60c",
  "33": "#f9f1a5",
  "34": "#0037da",
  "35": "#881798",
  "36": "#3a96dd",
  "37": "#cccccc",
  "90": "#767676",
} as { [key: string]: string };

export function updateDecorations(activeEditor: vscode.TextEditor, logInfo: LogInfo) {
  if (!activeEditor) {
    return;
  }

  // Decorate timestamps
  const numberOfLines = activeEditor.document.lineCount;
  activeEditor.setDecorations(
    timestampDecorationType,
    Array.from(Array(numberOfLines).keys())
      .filter((i) => {
        const line = activeEditor.document.lineAt(i).text;
        return timestampRE.test(line);
      })
      .map((i) => ({
        range: new vscode.Range(i, 0, i, 28), // timestamps always have 28 chars
      })),
  );

  // Custom colors
  const ctypes: {
    [key: string]: { type: vscode.TextEditorDecorationType; ranges: any[] };
  } = {};

  for (const colorFormat of logInfo.colorFormats) {
    const range = new vscode.Range(colorFormat.line, colorFormat.start, colorFormat.line, colorFormat.end);

    const key = `${colorFormat.color.foreground}-${colorFormat.color.background}`;
    if (!ctypes[key]) {
      ctypes[key] = {
        type: vscode.window.createTextEditorDecorationType({
          color: colorFormat.color.foreground && foreground[colorFormat.color.foreground],
          backgroundColor: colorFormat.color.background && background[colorFormat.color.background],
        }),
        ranges: [range],
      };
    } else {
      ctypes[key].ranges.push(range);
    }
  }

  for (const ctype of Object.values(ctypes)) {
    activeEditor.setDecorations(ctype.type, ctype.ranges);
  }
}
