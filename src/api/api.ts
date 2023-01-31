import {Octokit} from "@octokit/rest";
import {version} from "../../package.json";

export function getClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    userAgent: `VS Code GitHub Actions (${version})`
  });
}
