import Octokit = require("@octokit/rest");

export function getClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: "VS Code GitHub Actions",
    previews: ["jane-hopper"]
  });
}
