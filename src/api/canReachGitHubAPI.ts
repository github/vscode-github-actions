import {TTLCache} from "@actions/languageserver/utils/cache";

import {getSession} from "../auth/auth";
import {logError} from "../log";
import {getClient} from "./api";
import {isUnauthorizedError} from "./authErrors";

const API_ACCESS_TTL_MS = 10 * 1000;
const cache = new TTLCache(API_ACCESS_TTL_MS);

/**
 * - `ok`: the API accepted the session token
 * - `signed-out`: there is no session
 * - `unauthorized`: the API rejected the session token (e.g., it was revoked or has expired)
 * - `unreachable`: any other failure, e.g., no network connection
 */
export type GitHubAPIStatus = "ok" | "signed-out" | "unauthorized" | "unreachable";

export async function getGitHubAPIStatus(): Promise<GitHubAPIStatus> {
  const session = await getSession();
  if (!session) {
    return "signed-out";
  }
  return await cache.get("gitHubAPIStatus", undefined, async (): Promise<GitHubAPIStatus> => {
    try {
      const octokit = getClient(session.accessToken);
      await octokit.request("GET /");
    } catch (e) {
      logError(e as Error, "Error getting GitHub context");
      return isUnauthorizedError(e) ? "unauthorized" : "unreachable";
    }
    return "ok";
  });
}

export async function canReachGitHubAPI() {
  return (await getGitHubAPIStatus()) === "ok";
}

export function resetGitHubAPIStatus() {
  cache.clear();
}
