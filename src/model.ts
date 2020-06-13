import { Octokit } from "@octokit/rest";

// Type helpers
type Modify<T, R> = Omit<T, keyof R> & R;

type Await<T> = T extends {
  then(onfulfilled?: (value: infer U) => unknown): unknown;
}
  ? U
  : T;

type GetElementType<T extends Array<any>> = T extends (infer U)[] ? U : never;

type OctokitData<
  Operation extends keyof Octokit["actions"],
  ResultProperty extends keyof Await<
    ReturnType<Octokit["actions"][Operation]>
  >["data"]
> = GetElementType<
  Await<ReturnType<Octokit["actions"][Operation]>>["data"][ResultProperty]
>;

//
// Domain types
//

export type Workflow = OctokitData<"listRepoWorkflows", "workflows">;
export type WorkflowRun = OctokitData<"listWorkflowRuns", "workflow_runs"> & {
  conclusion: string;
};

export type WorkflowJob = OctokitData<"listJobsForWorkflowRun", "jobs">;

export type WorkflowStep = GetElementType<WorkflowJob["steps"]>;

export type RepoSecret = OctokitData<"listRepoSecrets", "secrets">;

export type SelfHostedRunner = OctokitData<
  "listSelfHostedRunnersForRepo",
  "runners"
>;
