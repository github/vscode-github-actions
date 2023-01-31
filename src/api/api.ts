import {Octokit} from "@octokit/rest";
import {version} from "../../package.json";

// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
export const userAgent = `VS Code GitHub Actions (${version})`;

export function getClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: userAgent
  });
}
