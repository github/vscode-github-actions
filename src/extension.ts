import * as vscode from 'vscode';
import { ActionsExplorerProvider } from './explorer/provider';
import { initResources } from './explorer/icons';

export function activate(context: vscode.ExtensionContext) {
	initResources(context);

	const explorerTreeProvider = new ActionsExplorerProvider();

	context.subscriptions.push(vscode.window.registerTreeDataProvider("actionsExplorer", explorerTreeProvider));

	context.subscriptions.push(vscode.commands.registerCommand("explorer.refresh", () => {
		explorerTreeProvider.refresh();
	}));

	context.subscriptions.push(vscode.commands.registerCommand("explorer.openRun", args => {
		const url = args.url || args;
		vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
	}));
}

// this method is called when your extension is deactivated
export function deactivate() { }
