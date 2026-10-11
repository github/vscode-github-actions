import {readFileSync} from "fs";
import {homedir} from "os";
import {join} from "path";
import {resolverFromConfig} from "../external/ssh";

/**
 * Extract the host name from a git remote URL.
 *
 * Handles both URL-style remotes (`https://host/owner/repo.git`, `ssh://git@host/owner/repo.git`)
 * and scp-style remotes (`git@host:owner/repo.git`), which `new URL()` rejects.
 *
 * Returns `undefined` when the host cannot be determined instead of throwing, so a single
 * unparseable remote in a multi-root workspace does not abort extension activation.
 */
export function getRemoteHost(remoteUrl: string): string | undefined {
  // scp-style: [user@]host:path  (no scheme, no leading slash in the path segment)
  const scpMatch = /^(?:[^@/]+@)?([^:/]+):(?!\/\/)/.exec(remoteUrl);
  if (scpMatch) {
    return scpMatch[1].toLowerCase();
  }

  try {
    const host = new URL(remoteUrl).hostname;
    return host ? host.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Try to resolve a hostname that may be an SSH config alias to its real HostName
 * by reading ~/.ssh/config. Returns the original alias (lowercased) unchanged if
 * the file cannot be read or contains no HostName directive for that alias.
 */
function resolveHostViaSshConfig(alias: string): string {
  try {
    const configPath = join(homedir(), ".ssh", "config");
    const configText = readFileSync(configPath, "utf-8");
    const resolver = resolverFromConfig(configText);
    // resolverFromConfig returns `h => config.compute(h.Host)` — only Host is used.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolved = resolver({Host: alias} as any);
    const hostName = (resolved as {HostName?: string}).HostName;
    return hostName ? hostName.toLowerCase() : alias.toLowerCase();
  } catch {
    return alias.toLowerCase();
  }
}

function isGitHubHost(host: string, enterpriseHost?: string): boolean {
  if (host.includes("github.com")) {
    return true;
  }
  if (host.endsWith(".ghe.com")) {
    return true;
  }
  if (enterpriseHost && host.includes(enterpriseHost.toLowerCase())) {
    return true;
  }
  return false;
}

/**
 * Whether a git remote URL points at GitHub: github.com, the configured GitHub Enterprise
 * host, or a GitHub Enterprise Cloud with data residency host (`*.ghe.com`).
 *
 * SSH config aliases (e.g. `git@personal:owner/repo.git` where `personal` is mapped to
 * `github.com` in `~/.ssh/config`) are resolved via the SSH config file so they are
 * recognised even when the alias name does not contain "github.com".
 *
 * Returns `false` — instead of throwing — when the URL cannot be parsed, so one
 * unparseable remote in a multi-root workspace does not abort extension activation.
 */
export function isGitHubRemoteUrl(remoteUrl: string, enterpriseHost?: string): boolean {
  const rawHost = getRemoteHost(remoteUrl);
  if (!rawHost) {
    return false;
  }

  // Fast path: the host name is already recognisable as GitHub.
  if (isGitHubHost(rawHost, enterpriseHost)) {
    return true;
  }

  // Slow path: rawHost may be an SSH config alias — resolve it and check again.
  const resolvedHost = resolveHostViaSshConfig(rawHost);
  if (resolvedHost === rawHost) {
    // SSH config gave no different answer; treat as non-GitHub.
    return false;
  }

  return isGitHubHost(resolvedHost, enterpriseHost);
}
