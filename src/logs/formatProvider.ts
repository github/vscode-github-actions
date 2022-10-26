import * as vscode from "vscode"
import {LogInfo} from "./model"
import {Parser, ColorToHex} from './parser'

const timestampRE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{7}Z/;

const timestampDecorationType = vscode.window.createTextEditorDecorationType({
  color: "#99999959"
});

export function updateDecorations(activeEditor: vscode.TextEditor, logInfo: LogInfo) {
  if (!activeEditor) {
    return;
  }

  // Decorate timestamps
  const numberOfLines = activeEditor.document.lineCount;
  activeEditor.setDecorations(
    timestampDecorationType,
    Array.from(Array(numberOfLines).keys())
      .filter(i => {
        const line = activeEditor.document.lineAt(i).text;
        return timestampRE.test(line);
      })
      .map(i => ({
        range: new vscode.Range(i, 0, i, 28) // timestamps always have 28 chars
      }))
  );

  // Custom colors
  const ctypes: {
    [key: string]: {type: vscode.TextEditorDecorationType; ranges: vscode.Range[]};
  } = {};

  for (let lineNo = 0; lineNo < logInfo.updatedLogLines.length; lineNo++) {
    // .filter() preserves the order of the array
    const lineStyles = logInfo.styleFormats.filter(style => style.line == lineNo)
    let pos = 0
    for (let styleNo = 0; styleNo < lineStyles.length; styleNo++) {
      const style = lineStyles[styleNo]
      const endPos = pos + style.content.length
      const range = new vscode.Range(lineNo, pos, lineNo, endPos);
      pos = endPos

      if (style.style) {
        const key = Parser.styleKey(style.style)
        let fgHex = ""
        let bgHex = ""

        // Convert to hex colors if RGB-formatted, or use lookup for predefined colors
        if (style.style.isFgRGB) {
          const rgbValues = style.style.fg.split(',')
          if (rgbValues.length == 3) {
            fgHex = "#"
            for (let i = 0; i < 3; i++) {
              fgHex.concat(parseInt(rgbValues[i]).toString(16))
            }
          }
        } else {
          fgHex = ColorToHex[style.style.fg]
        }
        if (style.style.isBgRGB) {
          const rgbValues = style.style.bg.split(',')
          if (rgbValues.length == 3) {
            bgHex = "#"
            for (let i = 0; i < 3; i++) {
              bgHex.concat(parseInt(rgbValues[i]).toString(16))
            }
          }
        } else {
          bgHex = ColorToHex[style.style.bg]
        }

        if (!ctypes[key]) {
          ctypes[key] = {
            type: vscode.window.createTextEditorDecorationType({
              color: fgHex,
              backgroundColor: bgHex,
              fontWeight: style.style.bold ? "bold" : "normal",
              fontStyle: style.style.italic ? "italic" : "normal",
              textDecoration: style.style.underline ? "underline" : ""
            }),
            ranges: [range]
          };
        } else {
          ctypes[key].ranges.push(range);
        }
      }
    }
  }

  for (const ctype of Object.values(ctypes)) {
    activeEditor.setDecorations(ctype.type, ctype.ranges);
  }
}
