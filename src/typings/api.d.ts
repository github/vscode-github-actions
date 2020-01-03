import Octokit = require("@octokit/rest");

export type Params = {
  owner: string;
  repo: string;
};

export type WorkflowParams = {
  workflow: string;
};

export type WorkflowRunParams = {
  run: number;
};

declare class OctokitWithActions extends Octokit {
  actions: {
    listWorkflows: {
      (params?: Octokit.RequestOptions & Params): Promise<
        Octokit.AnyResponse
      >;

      endpoint: Octokit.Endpoint;
    };

    cancelWorkflow: {
      (params?: Octokit.RequestOptions & Params & WorkflowRunParams): Promise<
        Octokit.AnyResponse
      >;

      endpoint: Octokit.Endpoint;
    };

    rerunWorkflow: {
      (params?: Octokit.RequestOptions & Params & WorkflowRunParams): Promise<
        Octokit.AnyResponse
      >;

      endpoint: Octokit.Endpoint;
    };
  };
}
