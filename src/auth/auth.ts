import * as vscode from "vscode";

const AUTH_PROVIDER_ID = "github";
const DEFAULT_SCOPES = ["repo", "workflow"];

export async function getSession(): Promise<vscode.AuthenticationSession> {
  const existingSession = await vscode.authentication.getSession(AUTH_PROVIDER_ID, getScopes(), {
    createIfNone: true
  });

  if (!existingSession) {
    throw new Error("Could not get token from the GitHub authentication provider. \nPlease sign-in and allow access.");
  }

  return existingSession;
}

function getScopes(): string[] {
  return DEFAULT_SCOPES;
}
