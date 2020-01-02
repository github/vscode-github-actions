import Octokit = require("@octokit/rest");

declare class OctokitWithActions extends Octokit {
  actions: {
    listWorkflows: {
      (
        params?: Octokit.RequestOptions &
          Octokit.ActivityCheckStarringRepoParams
      ): Promise<Octokit.AnyResponse>;

      endpoint: Octokit.Endpoint;
    };
  };
}
