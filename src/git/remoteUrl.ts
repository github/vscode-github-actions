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
  // scp-style: [user@]host:path (no scheme, no leading slash in path)
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
 * Whether a git remote points at GitHub: github.com, the configured GitHub Enterprise host, or a
 * GitHub Enterprise Cloud with data residency host (`*.ghe.com`).
 *
 * The comparison is made against the parsed, lower-cased host so a `github.com` segment in the
 * repository path or a differently cased host does not change the result. It is a substring match
 * rather than an equality check so SSH config aliases such as `github.com-work` keep matching.
 */
export function isGitHubRemoteUrl(remoteUrl: string, enterpriseHost?: string): boolean {
  const host = getRemoteHost(remoteUrl);
  if (!host) {
    return false;
  }

  if (host.includes("github.com")) {
    return true;
  }

  if (enterpriseHost && host.includes(enterpriseHost.toLowerCase())) {
    return true;
  }

  return host.endsWith(".ghe.com");
}
