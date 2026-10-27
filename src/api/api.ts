import {Octokit} from "@octokit/rest";
import {version} from "../../package.json";
import {getGitHubApiUri} from "../configuration/configuration";
import {isUnauthorizedError, notifyUnauthorized} from "./authErrors";

export const userAgent = `VS Code GitHub Actions (${version})`;

export function getClient(token: string): Octokit {
  const client = new Octokit({
    auth: token,
    userAgent: userAgent,
    baseUrl: getGitHubApiUri()
  });

  // Surface rejected tokens wherever they happen, so the user is offered a way to sign in again
  client.hook.error("request", error => {
    if (isUnauthorizedError(error)) {
      notifyUnauthorized();
    }
    throw error;
  });

  return client;
}
