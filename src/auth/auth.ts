import * as vscode from "vscode";

const AUTH_PROVIDER_ID = "github";
const DEFAULT_SCOPES = ["repo", "workflow"];

let signInPrompted = false;

const SESSION_ERROR = "Could not get token from the GitHub authentication provider. \nPlease sign-in and allow access.";

/**
 * Creates a session from the GitHub authentication provider
 * @param forceMessage Prompt to the user when forcing a new session
 * @returns A {@link vscode.AuthenticationSession}
 */
export async function newSession(forceMessage: string): Promise<vscode.AuthenticationSession> {
  const session = await getSessionInternal(forceMessage);
  if (session) {
    return session;
  }
  throw new Error(SESSION_ERROR);
}

/**
 * Retrieves a session from the GitHub authentication provider or prompts the user to sign in
 * @returns A {@link vscode.AuthenticationSession} or undefined
 */
export async function getSession(skipPrompt = false): Promise<vscode.AuthenticationSession | undefined> {
  const session = await getSessionInternal(skipPrompt);
  if (session) {
    await vscode.commands.executeCommand("setContext", "github-actions.signed-in", true);
    return session;
  }

  if (signInPrompted || skipPrompt) {
    return undefined;
  }

  signInPrompted = true;
  const signInAction = "Sign in to GitHub";
  vscode.window
    .showInformationMessage("Sign in to GitHub to access your repositories and GitHub Actions workflows.", signInAction)
    .then(
      async result => {
        if (result === signInAction) {
          const session = await getSessionInternal(true);
          if (session) {
            await vscode.commands.executeCommand("setContext", "github-actions.signed-in", true);
          }
        }
      },
      () => {
        // Ignore rejected promise
      }
    );

  // User chose to not sign in or hasn't signed in yet
  return undefined;
}

async function getSessionInternal(forceNewMessage: string): Promise<vscode.AuthenticationSession | undefined>;
async function getSessionInternal(createIfNone: boolean): Promise<vscode.AuthenticationSession | undefined>;
async function getSessionInternal(
  createOrForceMessage: string | boolean = false
): Promise<vscode.AuthenticationSession | undefined> {
  // forceNewSession and createIfNone are mutually exclusive
  const options: vscode.AuthenticationGetSessionOptions =
    typeof createOrForceMessage === "string"
      ? {forceNewSession: {detail: createOrForceMessage}}
      : {createIfNone: createOrForceMessage};
  return await vscode.authentication.getSession(AUTH_PROVIDER_ID, getScopes(), options);
}

function getScopes(): string[] {
  return DEFAULT_SCOPES;
}
