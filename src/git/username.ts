import {Octokit} from "@octokit/rest";
import {logError} from "../log";

export async function getUsername(octokit: Octokit): Promise<string> {
  try {
    return (await octokit.users.getAuthenticated()).data.login;
  } catch (e) {
    logError(e as Error, "Failure to retrieve username");
    throw e;
  }
}
