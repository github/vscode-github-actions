import {
  ActionsListRepoWorkflowsResponseWorkflowsItem,
  ActionsListSecretsForRepoResponseItemSecretsItem,
  ActionsListWorkflowRunsResponseWorkflowRunsItem,
  ActionsListSelfHostedRunnersForRepoResponseItemItem
} from "@octokit/rest";

type Modify<T, R> = Omit<T, keyof R> & R;

export type Workflow = ActionsListRepoWorkflowsResponseWorkflowsItem;
export interface WorkflowRun
  extends Modify<
    ActionsListWorkflowRunsResponseWorkflowRunsItem,
    { conclusion: string }
  > {}

export type Secret = ActionsListSecretsForRepoResponseItemSecretsItem;

export type SelfHostedRunner = ActionsListSelfHostedRunnersForRepoResponseItemItem;
