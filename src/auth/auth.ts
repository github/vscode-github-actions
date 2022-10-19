import * as vscode from "vscode";

import {orgFeaturesEnabled, updateOrgFeaturesEnabled} from "../configuration/configuration";

import {resetGitHubContext} from "../git/repository";

const AUTH_PROVIDER_ID = "github";
const DEFAULT_SCOPES = ["repo", "workflow"];
const ORG_SCOPES = [...DEFAULT_SCOPES, "admin:org"];

export function registerListeners(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.authentication.onDidChangeSessions(async e => {
      if (e.provider.id === AUTH_PROVIDER_ID) {
        await enableOrgFeatures();
      }
    })
  );
}

export async function getSession(): Promise<vscode.AuthenticationSession> {
  const existingSession = await vscode.authentication.getSession(AUTH_PROVIDER_ID, getScopes(), {
    createIfNone: true
  });

  if (!existingSession) {
    throw new Error("Could not get token from the GitHub authentication provider. \nPlease sign-in and allow access.");
  }

  return existingSession;
}

export async function enableOrgFeatures() {
  await updateOrgFeaturesEnabled(true);

  await resetGitHubContext();

  // TODO: CS: There has be a better way :)
  await vscode.commands.executeCommand("github-actions.explorer.refresh");
}

function getScopes(): string[] {
  if (orgFeaturesEnabled()) {
    return ORG_SCOPES;
  }

  return DEFAULT_SCOPES;
}
