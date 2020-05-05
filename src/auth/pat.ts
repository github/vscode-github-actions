import * as vscode from "vscode";

const AUTH_PROVIDER_ID = "github";
const SCOPES = ["repo", "workflows"];

let token: Promise<string> | undefined;

export async function getPAT(): Promise<string | null> {
  if (token) {
    return token;
  }

  return (token = new Promise(async (resolve) => {
    const existingSessions = await vscode.authentication.getSessions(
      AUTH_PROVIDER_ID,
      SCOPES
    );

    if (existingSessions.length) {
      resolve(await existingSessions[0].getAccessToken());
    } else {
      const session = await vscode.authentication.login(
        AUTH_PROVIDER_ID,
        SCOPES
      );
      resolve(await session.getAccessToken());
    }
  }));
}
