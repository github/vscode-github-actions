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

export type SecretParams = {
  name: string;
  key_id: string;
  encrypted_value: string;
};

declare class OctokitWithActions extends Octokit {
  actions: {
    listWorkflows: {
      (params?: Octokit.RequestOptions & Params): Promise<Octokit.AnyResponse>;

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

    getSecrets: {
      (params?: Octokit.RequestOptions & Params): Promise<Octokit.AnyResponse>;

      endpoint: Octokit.Endpoint;
    };

    setSecret: {
      (params?: Octokit.RequestOptions & Params & SecretParams): Promise<
        Octokit.AnyResponse
      >;

      endpoint: Octokit.Endpoint;
    };

    getPublicKey: {
      (params?: Octokit.RequestOptions & Params): Promise<Octokit.AnyResponse>;

      endpoint: Octokit.Endpoint;
    };
  };
}
