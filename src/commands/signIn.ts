import * as vscode from "vscode";
import {setViewContexts} from "../viewContexts";

export function registerSignIn(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.sign-in", async () => {
      await setViewContexts();
    })
  );
}
