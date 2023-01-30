import {EmptyNode} from "./emptyNode";
import {EnvironmentNode} from "./environmentNode";
import {EnvironmentSecretsNode} from "./environmentSecretsNode";
import {EnvironmentsNode} from "./environmentsNode";
import {VariableNode} from "./variableNode";
import {EnvironmentVariablesNode} from "./environmentVariablesNode";
import {SecretNode} from "./secretNode";
import {SecretsNode} from "./secretsNode";
import {SelfHostedRunnersNode} from "./selfHostedRunnersNode";
import {VariablesNode} from "./variablesNode";

export type SettingsExplorerNode =
  | SelfHostedRunnersNode
  | SecretsNode
  | SecretNode
  | EnvironmentsNode
  | EnvironmentNode
  | EnvironmentSecretsNode
  | VariableNode
  | VariablesNode
  | EnvironmentVariablesNode
  | EmptyNode;
