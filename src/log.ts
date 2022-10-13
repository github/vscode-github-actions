import * as vscode from 'vscode';

enum LogLevel {
  Debug,
  Info
}

let logger: vscode.OutputChannel;
const level: LogLevel = LogLevel.Debug;

export function init() {
  logger = vscode.window.createOutputChannel('GitHub Actions');
}

export function log(...values: string[]) {
  logger.appendLine(values.join(' '));
}

export function logDebug(...values: string[]) {
  if (level > LogLevel.Debug) {
    return;
  }

  logger.appendLine(values.join(' '));
}

export function logError(e: Error, ...values: string[]) {
  logger.appendLine(values.join(' '));
  logger.appendLine(e.message);
  if (e.stack) {
    logger.appendLine(e.stack);
  }
}
