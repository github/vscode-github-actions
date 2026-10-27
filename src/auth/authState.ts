import * as vscode from "vscode";

import {onUnauthorized} from "../api/authErrors";
import {GitHubAPIStatus, getGitHubAPIStatus, resetGitHubAPIStatus} from "../api/canReachGitHubAPI";
import {getGitHubContext, resetGitHubContext} from "../git/repository";
import {logError} from "../log";
import {restartLanguageServer} from "../workflow/languageServer";
import {getAuthProviderId} from "./auth";

let unauthorizedWarningShown = false;
let sessionChange: Promise<void> = Promise.resolve();

/**
 * Checks the session against the GitHub API and updates the context keys that control which views are shown
 */
export async function updateContextKeys(): Promise<{status: GitHubAPIStatus; hasGitHubRepos: boolean}> {
  const status = await getGitHubAPIStatus();
  const ghContext = status === "ok" ? await getGitHubContext() : undefined;
  const hasGitHubRepos = !!ghContext && ghContext.repos.length > 0;

  await Promise.all([
    vscode.commands.executeCommand("setContext", "github-actions.signed-in", status !== "signed-out"),
    vscode.commands.executeCommand("setContext", "github-actions.internet-access", status === "ok"),
    vscode.commands.executeCommand("setContext", "github-actions.auth-invalid", status === "unauthorized"),
    vscode.commands.executeCommand("setContext", "github-actions.has-repos", hasGitHubRepos)
  ]);

  if (status !== "unauthorized") {
    unauthorizedWarningShown = false;
  }

  return {status, hasGitHubRepos};
}

export function initAuthStateTracking(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    onUnauthorized(() => {
      handleUnauthorized().catch(e => logError(e as Error, "Error handling rejected GitHub session"));
    })
  );

  context.subscriptions.push(
    vscode.authentication.onDidChangeSessions(e => {
      if (e.provider.id !== getAuthProviderId()) {
        return;
      }

      // Serialize handling so overlapping events don't restart the language server concurrently
      sessionChange = sessionChange
        .then(() => handleSessionChange(context))
        .catch(e => logError(e as Error, "Error handling GitHub session change"));
    })
  );
}

async function handleUnauthorized() {
  await Promise.all([
    vscode.commands.executeCommand("setContext", "github-actions.auth-invalid", true),
    vscode.commands.executeCommand("setContext", "github-actions.internet-access", false)
  ]);

  if (unauthorizedWarningShown) {
    return;
  }
  unauthorizedWarningShown = true;

  const signInAction = "Sign in again";
  const result = await vscode.window.showWarningMessage(
    "GitHub rejected the saved sign-in for GitHub Actions. It may have expired or been revoked.",
    signInAction
  );
  if (result === signInAction) {
    await vscode.commands.executeCommand("github-actions.sign-in");
  }
}

async function handleSessionChange(context: vscode.ExtensionContext) {
  resetGitHubAPIStatus();
  resetGitHubContext();

  // The language server only receives the token on initialization
  await restartLanguageServer(context);

  await vscode.commands.executeCommand("github-actions.explorer.refresh");
}
