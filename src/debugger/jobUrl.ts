type ParseResult = {valid: true; owner: string; repo: string; jobId: string} | {valid: false; reason: string};

/**
 * Derives the expected web host from the configured GitHub API URI.
 *
 *   https://api.github.com        → github.com
 *   https://api.myorg.ghe.com     → myorg.ghe.com   (GHE Cloud)
 *   https://myserver.com/api/v3   → myserver.com     (GHE Server)
 */
export function getExpectedWebHost(apiUri: string): string {
  const url = new URL(apiUri);
  // GHE Server: host/api/v3
  if (url.pathname.replace(/\/$/, "") === "/api/v3") {
    return url.hostname;
  }
  // github.com or GHE Cloud (api.<org>.ghe.com): strip leading "api."
  if (url.hostname.startsWith("api.")) {
    return url.hostname.slice(4);
  }
  return url.hostname;
}

const JOB_PATH_RE = /^\/([^/]+)\/([^/]+)\/actions\/runs\/[^/]+\/jobs?\/([^/]+)\/?$/;

// Expected format: https://github.com/{owner}/{repo}/actions/runs/{runId}/job/{jobId}
export function parseJobUrl(raw: string, apiUri: string): ParseResult {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {valid: false, reason: "Invalid URL format"};
  }

  if (parsed.protocol !== "https:") {
    return {valid: false, reason: "URL must use https:// scheme"};
  }

  if (parsed.username || parsed.password) {
    return {valid: false, reason: "Credentials in URL are not allowed"};
  }

  const expectedHost = getExpectedWebHost(apiUri);
  if (parsed.hostname !== expectedHost) {
    return {valid: false, reason: `Expected host "${expectedHost}", got "${parsed.hostname}"`};
  }

  const match = JOB_PATH_RE.exec(parsed.pathname);
  if (!match) {
    return {
      valid: false,
      reason: "URL must be a GitHub Actions job URL (…/{owner}/{repo}/actions/runs/{runId}/job/{jobId})"
    };
  }

  return {valid: true, owner: match[1], repo: match[2], jobId: match[3]};
}
