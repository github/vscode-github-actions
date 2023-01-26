import {EmptyEnvironmentSecretsNode} from "./emptyEnvironmentSecretsNode";
import {EnvironmentNode} from "./environmentNode";
import {EnvironmentSecretNode} from "./environmentSecretNode";
import {EnvironmentsNode} from "./environmentsNode";
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
  | EmptyEnvironmentSecretsNode
  | VariablesNode
  | RepoVariableNode;
