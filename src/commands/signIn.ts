import * as vscode from "vscode";
import {getSession} from "../auth/auth";
import {canReachGitHubAPI} from "../api/canReachGitHubAPI";
import {getGitHubContext} from "../git/repository";

export function registerSignIn(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.sign-in", async () => {
      const session = await getSession(true);
      if (session) {
        const canReachAPI = await canReachGitHubAPI();
        const ghContext = await getGitHubContext();
        const hasGitHubRepos = ghContext && ghContext.repos.length > 0;

        await vscode.commands.executeCommand("setContext", "github-actions.signed-in", true);
        await vscode.commands.executeCommand("setContext", "github-actions.internet-access", canReachAPI);
        await vscode.commands.executeCommand("setContext", "github-actions.has-repos", hasGitHubRepos);
      }
    })
  );
}
