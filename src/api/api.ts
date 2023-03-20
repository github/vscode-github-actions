import {Octokit} from "@octokit/rest";
import {version} from "../../package.json";

export const userAgent = `VS Code GitHub Actions (${version})`;

export function getClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: userAgent
  });
}
