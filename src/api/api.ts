import {Octokit} from "@octokit/rest";
import {enterpriseServer34} from "@octokit/plugin-enterprise-server";
import {version} from "../../package.json";
import {getGitHubApiUri, isUseEnterprise} from "../configuration/configuration";

export const userAgent = `VS Code GitHub Actions (${version})`;

export const OctokitES = Octokit.plugin(enterpriseServer34);

export function getClient(token: string): Octokit {
  return isUseEnterprise()
    ? new OctokitES({
        auth: token,
        userAgent: userAgent,
        baseUrl: `${getGitHubApiUri()}`
      })
    : new Octokit({
        auth: token,
        userAgent: userAgent
      });
}
