import Octokit = require("@octokit/rest");
import { getPAT } from "../auth/pat";
import { getClient as getAPIClient } from "../api/api";

export async function getClient(): Promise<Octokit> {
  const token = await getPAT();
  if (!token) {
    throw new Error("No PAT found");
  }

  return getAPIClient(token);
}
