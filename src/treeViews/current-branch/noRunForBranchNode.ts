import * as vscode from 'vscode'

export class NoRunForBranchNode extends vscode.TreeItem {
  constructor() {
    super('No runs for current branch')
  }
}
