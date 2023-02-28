import {EmptyNode} from "./emptyNode";
import {EnvironmentNode} from "./environmentNode";
import {EnvironmentSecretsNode} from "./environmentSecretsNode";
import {EnvironmentsNode} from "./environmentsNode";
import {VariableNode} from "./variableNode";
import {EnvironmentVariablesNode} from "./environmentVariablesNode";
import {SecretNode} from "./secretNode";
import {SecretsNode} from "./secretsNode";
import {VariablesNode} from "./variablesNode";
import {RepoVariablesNode} from "./repoVariablesNode";
import {OrgVariablesNode} from "./orgVariablesNode";
import {OrgSecretsNode} from "./orgSecretsNode";
import {RepoSecretsNode} from "./repoSecretsNode";
import {NoGitHubRepositoryNode} from "../shared/noGitHubRepositoryNode";
import {NoWorkflowJobsNode} from "../shared/noWorkflowJobsNode";
import {WorkflowStepNode} from "../workflows/workflowStepNode";
import {AttemptNode} from "../shared/attemptNode";
import {AuthenticationNode} from "../shared/authenticationNode";
import {PreviousAttemptsNode} from "../shared/previousAttemptsNode";
import {WorkflowJobNode} from "../shared/workflowJobNode";
import {WorkflowRunNode} from "../shared/workflowRunNode";
import {WorkflowNode} from "../workflows/workflowNode";
import {NoInternetConnectivityNode} from "../shared/noInternetConnectivityNode";
import {NoRunForBranchNode} from "../current-branch/noRunForBranchNode";
import {CurrentBranchRepoNode} from "../current-branch/currentBranchRepoNode";

export type SettingsExplorerNode =
  | SecretsNode
  | SecretNode
  | EnvironmentsNode
  | EnvironmentNode
  | EnvironmentSecretsNode
  | EnvironmentVariablesNode
  | OrgSecretsNode
  | OrgVariablesNode
  | RepoSecretsNode
  | RepoVariablesNode
  | VariableNode
  | VariablesNode
  | EmptyNode
  | NoInternetConnectivityNode;

export type WorkflowsTreeNode =
  | AuthenticationNode
  | NoGitHubRepositoryNode
  | WorkflowNode
  | WorkflowRunNode
  | PreviousAttemptsNode
  | AttemptNode
  | WorkflowJobNode
  | NoWorkflowJobsNode
  | WorkflowStepNode
  | NoInternetConnectivityNode;

export type CurrentBranchTreeNode =
  | CurrentBranchRepoNode
  | WorkflowRunNode
  | PreviousAttemptsNode
  | AttemptNode
  | WorkflowJobNode
  | NoWorkflowJobsNode
  | WorkflowStepNode
  | NoRunForBranchNode
  | NoInternetConnectivityNode;
