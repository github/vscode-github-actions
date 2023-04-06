import * as vscode from "vscode";
import {getSession} from "./auth/auth";
import {canReachGitHubAPI} from "./api/canReachGitHubAPI";
import {getGitHubContext} from "./git/repository";

export async function setViewContexts() {
  // getSession() will setContext for github-actions.signed-in
  const session = await getSession(true);

  if (session) {
    const canReachAPI = await canReachGitHubAPI();
    const ghContext = await getGitHubContext();
    const hasGitHubRepos = ghContext && ghContext.repos.length > 0;

    await Promise.all([
      vscode.commands.executeCommand("setContext", "github-actions.internet-access", canReachAPI),
      vscode.commands.executeCommand("setContext", "github-actions.has-repos", hasGitHubRepos)
    ]);
  }
}
