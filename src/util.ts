import {Octokit} from "@octokit/rest";

import {logError} from "./log";

export async function hasInternetConnectivity() {
  try {
    const octokit = new Octokit();
    await octokit.request("GET /", {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
  } catch {
    logError(new Error("Unable to connect to GitHub API"));
    return false;
  }
  return true;
}
