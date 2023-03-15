import {Octokit} from "@octokit/rest";

import {logError} from "./log";

export async function canReachGitHubAPI() {
  try {
    const octokit = new Octokit();
    await octokit.request("GET /", {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
  } catch (e) {
    logError(e as Error, "Error getting GitHub context");
    return false;
  }
  return true;
}
