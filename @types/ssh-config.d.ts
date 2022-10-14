/**
 * SSH Config interface
 *
 * Note that this interface atypically capitalizes field names. This is for consistency
 * with SSH config files.
 */

/**
 * ConfigResolvers take a config, resolve some additional data (perhaps using
 * a config file), and return a new Config.
 */
declare module "ssh-config" {
  export type ConfigResolver = (config: Config) => Config;

  export type Config = Record<string, string>;

  export class SSHConfig {
    compute: (host: string) => Config;
  }

  export function parse(config: string): SSHConfig;
}
