import * as vscode from 'vscode'

enum LogLevel {
  Debug = 0,
  Info = 1,
}

let logger: vscode.OutputChannel
const level: LogLevel = PRODUCTION ? LogLevel.Info : LogLevel.Debug

export function init() {
  logger = vscode.window.createOutputChannel('GitHub Actions')
}

export function log(...values: unknown[]) {
  logger.appendLine(values.join(' '))
}

export function logDebug(...values: unknown[]) {
  if (level > LogLevel.Debug) {
    return
  }

  logger.appendLine(values.join(' '))
}

export function logError(e: Error, ...values: unknown[]) {
  logger.appendLine(values.join(' '))
  logger.appendLine(e.message)
  if (e.stack) {
    logger.appendLine(e.stack)
  }
}

export function revealLog() {
  logger.show()
}
