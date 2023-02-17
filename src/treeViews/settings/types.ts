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
  | EmptyNode;
