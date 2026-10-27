import * as vscode from "vscode";
import {getSession, newSession} from "../auth/auth";
import {updateContextKeys} from "../auth/authState";
import {getGitHubAPIStatus, resetGitHubAPIStatus} from "../api/canReachGitHubAPI";
import {resetGitHubContext} from "../git/repository";
import {logError} from "../log";

export function registerSignIn(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.sign-in", async () => {
      const session = await getSession(true);
      if (!session) {
        return;
      }

      // A cached session can hold a token that GitHub no longer accepts, so asking for a session
      // again would return the same one. Force a new session instead.
      if ((await getGitHubAPIStatus()) === "unauthorized") {
        try {
          await newSession("GitHub rejected the saved sign-in. Sign in again to continue.");
        } catch (e) {
          logError(e as Error, "Error signing in again");
          return;
        }

        resetGitHubAPIStatus();
        resetGitHubContext();
      }

      await updateContextKeys();
    })
  );
}
