import * as vscode from 'vscode';
import { ActionsExplorerProvider } from './explorer/provider';
import { initResources } from './explorer/icons';
import { Workflow } from './model';
import { join } from 'path';

export function activate(context: vscode.ExtensionContext) {
	initResources(context);

	// Actions Explorer
	const explorerTreeProvider = new ActionsExplorerProvider();

	context.subscriptions.push(vscode.window.registerTreeDataProvider("actionsExplorer", explorerTreeProvider));

	context.subscriptions.push(vscode.commands.registerCommand("explorer.refresh", () => {
		explorerTreeProvider.refresh();
	}));
	context.subscriptions.push(vscode.commands.registerCommand("explorer.openRun", args => {
		const url = args.url || args;
		vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
	}));
	context.subscriptions.push(vscode.commands.registerCommand("explorer.openWorkflowFile", async (args) => {
		const wf: Workflow = args.wf;

		for (const workspaceFolder of vscode.workspace.workspaceFolders || []) {
			const fileUri = vscode.Uri.file(join(workspaceFolder.uri.fsPath, wf.path));
			if (vscode.workspace.getWorkspaceFolder(fileUri)) {
				const textDocument = await vscode.workspace.openTextDocument(fileUri);
				vscode.window.showTextDocument(textDocument);
				return;
			}
		}

		// File not found in workspace
	}));
}

// this method is called when your extension is deactivated
export function deactivate() { }
