import {EmptyNode} from "./emptyNode";
import {EnvironmentNode} from "./environmentNode";
import {EnvironmentSecretNode} from "./environmentSecretNode";
import {EnvironmentSecretsNode} from "./environmentSecretsNode";
import {EnvironmentsNode} from "./environmentsNode";
import {VariableNode} from "./variableNode";
import {EnvironmentVariablesNode} from "./environmentVariablesNode";
import {RepoSecretNode} from "./repoSecretNode";
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
  | VariableNode
  | VariablesNode
  | EnvironmentVariablesNode
  | EnvironmentSecretNode
  | EmptyNode;
