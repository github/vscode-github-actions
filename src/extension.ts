import * as vscode from 'vscode';
import { ActionsExplorerProvider } from './explorer/provider';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.window.registerTreeDataProvider("actionsExplorer", new ActionsExplorerProvider()));

	// vscode.window.createTreeView("actionsExplorer")
}

// this method is called when your extension is deactivated
export function deactivate() {}
