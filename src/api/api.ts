import Octokit = require("@octokit/rest");
import { OctokitWithActions } from "../typings/api";

export function getClient(token: string): OctokitWithActions {
  const client = (new Octokit({
    auth: token,
    userAgent: "VS Code GitHub Actions",
    previews: ["jane-hopper"]
  }) as any) as OctokitWithActions;

  // Register endpoints for API in development
  client.registerEndpoints({
    actions: {
      listWorkflows: {
        method: "GET",
        params: {
          owner: { required: true, type: "string" },
          repo: { required: true, type: "string" }
        },
        headers: {
          accept: "application/vnd.github.jane-hopper-preview+json"
        },
        url: "/repos/:owner/:repo/actions/workflows"
      }
    }
  });

  return client;
}
