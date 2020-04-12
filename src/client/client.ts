import { Octokit } from "@octokit/rest";
import { getClient as getAPIClient } from "../api/api";
import { getPAT } from "../auth/pat";

export async function getClient(): Promise<Octokit> {
  const token = await getPAT();
  if (!token) {
    throw new Error("No PAT found");
  }

  return getAPIClient(token);
}
