import {Octokit} from "@octokit/rest";
import {getSession} from "../auth/auth";
import {logDebug} from "../log";
import {getClient} from "./api";

export async function handleSamlError<T>(request: (client: Octokit) => Promise<T>): Promise<T> {
  try {
    const session = await getSession();
    const client = getClient(session.accessToken);
    return await request(client);
  } catch (error) {
    if ((error as Error).message.includes("Resource protected by organization SAML enforcement.")) {
      logDebug("SAML error, re-authenticating");
      const session = await getSession(
        "Your organization is protected by SAML enforcement. Please sign-in again to continue."
      );
      const client = getClient(session.accessToken);
      return await request(client);
    } else {
      throw error;
    }
  }
}
