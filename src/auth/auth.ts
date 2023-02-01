import * as vscode from "vscode";

const AUTH_PROVIDER_ID = "github";
const DEFAULT_SCOPES = ["repo", "workflow"];

/**
 * Retrieves a session from the GitHub authentication provider
 * @param forceMessage Force a new session with a prompt to the user
 * @returns A {@link vscode.AuthenticationSession}
 */
export async function getSession(forceMessage?: string): Promise<vscode.AuthenticationSession> {
  const existingSession = await vscode.authentication.getSession(AUTH_PROVIDER_ID, getScopes(), {
    createIfNone: true,
    forceNewSession: forceMessage ? {detail: forceMessage} : false
  });

  if (!existingSession) {
    throw new Error("Could not get token from the GitHub authentication provider. \nPlease sign-in and allow access.");
  }

  return existingSession;
}

function getScopes(): string[] {
  return DEFAULT_SCOPES;
}
