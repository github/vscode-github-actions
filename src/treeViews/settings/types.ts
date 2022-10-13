import {EmptyEnvironmentSecretsNode} from './emptyEnvironmentSecretsNode';
import {EnvironmentNode} from './environmentNode';
import {EnvironmentSecretNode} from './environmentSecretNode';
import {EnvironmentsNode} from './environmentsNode';
import {OrgFeaturesNode} from './orgFeaturesNode';
import {OrgSecretNode} from './orgSecretNode';
import {RepoSecretNode} from './repoSecretNode';
import {SecretsNode} from './secretsNode';
import {SelfHostedRunnersNode} from './selfHostedRunnersNode';

export type SettingsExplorerNode =
  | OrgFeaturesNode
  | SelfHostedRunnersNode
  | SecretsNode
  | RepoSecretNode
  | OrgSecretNode
  | EnvironmentsNode
  | EnvironmentNode
  | EnvironmentSecretNode
  | EmptyEnvironmentSecretsNode;
