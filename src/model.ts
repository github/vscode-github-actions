import {
  ActionsListRepoWorkflowsResponseWorkflowsItem,
  ActionsListSecretsForRepoResponseItemSecretsItem,
  ActionsListWorkflowRunsResponseWorkflowRunsItem,
  ActionsListSelfHostedRunnersForRepoResponseItemItem,
  ActionsListJobsForWorkflowRunResponseItemWorkflowJobsItem,
  ActionsListJobsForWorkflowRunResponseItemWorkflowJobsItemStepsItem
} from "@octokit/rest";

type Modify<T, R> = Omit<T, keyof R> & R;

export type Workflow = ActionsListRepoWorkflowsResponseWorkflowsItem;
export interface WorkflowRun
  extends Modify<
    ActionsListWorkflowRunsResponseWorkflowRunsItem,
    { conclusion: string }
  > {}

export type WorkflowJob = ActionsListJobsForWorkflowRunResponseItemWorkflowJobsItem;

export type WorkflowStep = ActionsListJobsForWorkflowRunResponseItemWorkflowJobsItemStepsItem;

export type Secret = ActionsListSecretsForRepoResponseItemSecretsItem;

export type SelfHostedRunner = ActionsListSelfHostedRunnersForRepoResponseItemItem;
