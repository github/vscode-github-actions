import {EmptyNode} from "./emptyNode";
import {EnvironmentNode} from "./environmentNode";
import {EnvironmentSecretNode} from "./environmentSecretNode";
import {EnvironmentSecretsNode} from "./environmentSecretsNode";
import {EnvironmentsNode} from "./environmentsNode";
import {EnvironmentVariableNode} from "./environmentVariableNode";
import {EnvironmentVariablesNode} from "./environmentVariablesNode";
import {RepoSecretNode} from "./repoSecretNode";
import {RepoVariableNode} from "./repoVariableNode";
import {SecretsNode} from "./secretsNode";
import {SelfHostedRunnersNode} from "./selfHostedRunnersNode";
import {VariablesNode} from "./variablesNode";

export type SettingsExplorerNode =
  | SelfHostedRunnersNode
  | SecretsNode
  | RepoSecretNode
  | EnvironmentsNode
  | EnvironmentNode
  | EnvironmentSecretNode
  | EnvironmentSecretsNode
  | EnvironmentVariableNode
  | EnvironmentVariablesNode
  | EnvironmentSecretNode
  | EmptyNode
  | VariablesNode
  | RepoVariableNode;
