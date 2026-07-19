import * as vscode from "vscode";

let logger: vscode.LogOutputChannel;

export function init() {
  logger = vscode.window.createOutputChannel("GitHub Actions", {log: true});
}

export function log(...values: unknown[]) {
  logger.info(values.join(" "));
}

export function logDebug(...values: unknown[]) {
  logger.debug(values.join(" "));
}

export function logError(e: Error, ...values: unknown[]) {
  logger.error(e, values);
}

export function revealLog() {
  logger.show();
}
