import {components} from '@octokit/openapi-types'
import {RestEndpointMethods} from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types'

// Type helpers
type Await<T> = T extends {
  then(onfulfilled?: (value: infer U) => unknown): unknown
}
  ? U
  : T

type GetElementType<T> = T extends (infer U)[] ? U : never

type OctokitData<
  Operation extends keyof RestEndpointMethods['actions'],
  ResultProperty extends keyof Await<ReturnType<RestEndpointMethods['actions'][Operation]>>['data'],
> = GetElementType<Await<ReturnType<RestEndpointMethods['actions'][Operation]>>['data'][ResultProperty]>

type OctokitRepoData<
  Operation extends keyof RestEndpointMethods['repos'],
  ResultProperty extends keyof Await<ReturnType<RestEndpointMethods['repos'][Operation]>>['data'],
> = GetElementType<Await<ReturnType<RestEndpointMethods['repos'][Operation]>>['data'][ResultProperty]>

//
// Domain contracts
//

export type Workflow = OctokitData<'listRepoWorkflows', 'workflows'>
export type WorkflowRun = components['schemas']['workflow-run']
export type WorkflowRunAttempt = WorkflowRun

export type WorkflowJob = OctokitData<'listJobsForWorkflowRun', 'jobs'>

export type WorkflowStep = GetElementType<WorkflowJob['steps']>

export type RepoSecret = OctokitData<'listRepoSecrets', 'secrets'>

export type RepoVariable = OctokitData<'listRepoVariables', 'variables'>

export type Environment = OctokitRepoData<'getAllEnvironments', 'environments'>

export type EnvironmentSecret = OctokitData<'listEnvironmentSecrets', 'secrets'>

export type EnvironmentVariable = OctokitData<'listEnvironmentVariables', 'variables'>

export type OrgSecret = {name: string}

export type OrgVariable = {name: string; value: string}
