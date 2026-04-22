import {TTLCache} from "@actions/languageserver/utils/cache";

import {getSession} from "../auth/auth";
import {getClient} from "../api/api";

const USES_PATTERN = /uses:\s*(['"]?)([^@\s'"]+)@([^\s'"#]+)/;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new TTLCache(CACHE_TTL_MS);

export interface ActionVersionInfo {
  latest: string;
  /** The latest major version tag, e.g. "v4" */
  latestMajor?: string;
}

export interface UsesReference {
  owner: string;
  name: string;
  actionPath: string;
  currentRef: string;
  /** Start of the full "owner/repo@ref" value */
  valueStart: number;
  /** End of the full "owner/repo@ref" value */
  valueEnd: number;
  /** Start of just the ref part after @ */
  refStart: number;
  /** End of just the ref part after @ */
  refEnd: number;
}

/**
 * Parses the `uses:` value from a workflow line and returns owner, name, and current ref.
 * Returns undefined for dynamic refs containing expression syntax like `${{`.
 */
export function parseUsesReference(line: string): UsesReference | undefined {
  const match = USES_PATTERN.exec(line);
  if (!match) {
    return undefined;
  }

  const actionPath = match[2]; // e.g. "actions/checkout" or "actions/cache/restore"
  const currentRef = match[3];

  // Skip dynamic refs (e.g. ${{ github.ref }})
  if (currentRef.includes("${{")) {
    return undefined;
  }

  const [owner, name] = actionPath.split("/");
  if (!owner || !name) {
    return undefined;
  }

  const fullMatchStart = match.index + match[0].indexOf(match[2]);
  const valueStart = fullMatchStart;
  const refStart = fullMatchStart + actionPath.length + 1; // +1 for @
  const refEnd = refStart + currentRef.length;
  const valueEnd = refEnd;

  return {owner, name, actionPath, currentRef, valueStart, valueEnd, refStart, refEnd};
}

export function extractMajorTag(tag: string): string | undefined {
  const match = /^(v?\d+)[\.\d]*/.exec(tag);
  return match ? match[1] : undefined;
}

/**
 * Returns true if the ref looks like a commit SHA (40-char hex string).
 */
export function isShaRef(ref: string): boolean {
  return /^[0-9a-f]{40}$/i.test(ref);
}

export async function fetchLatestVersion(owner: string, name: string): Promise<ActionVersionInfo | undefined> {
  const session = await getSession();
  if (!session) {
    return undefined;
  }

  const cacheKey = `action-latest-version:${owner}/${name}`;
  return cache.get<ActionVersionInfo | undefined>(cacheKey, undefined, async () => {
    const client = getClient(session.accessToken);

    // Try latest release first
    try {
      const {data} = await client.repos.getLatestRelease({owner, repo: name});
      if (data.tag_name) {
        const major = extractMajorTag(data.tag_name);
        return {latest: data.tag_name, latestMajor: major};
      }
    } catch {
      // No release found, fallback to tags
    }

    // Fallback: list tags and pick the first semver-like tag (tags are returned in creation-date order)
    try {
      const {data} = await client.repos.listTags({owner, repo: name, per_page: 10});
      if (data.length > 0) {
        const semverTag = data.find(t => /^v?\d+\.\d+/.test(t.name));
        const tag = semverTag || data[0];
        const major = extractMajorTag(tag.name);
        return {latest: tag.name, latestMajor: major};
      }
    } catch {
      // Ignore
    }

    return undefined;
  });
}
