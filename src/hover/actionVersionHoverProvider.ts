import * as vscode from "vscode";

import {TTLCache} from "@actions/languageserver/utils/cache";

import {getSession} from "../auth/auth";
import {getClient} from "../api/api";

const USES_PATTERN = /uses:\s*(['"]?)([^@\s'"]+)@([^\s'"#]+)/;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new TTLCache(CACHE_TTL_MS);

interface ActionVersionInfo {
  latest: string;
  /** The latest major version tag, e.g. "v4" */
  latestMajor?: string;
}

/**
 * Parses the `uses:` value from a workflow line and returns owner, name, and current ref.
 */
function parseUsesReference(
  line: string
): {owner: string; name: string; currentRef: string; valueStart: number; valueEnd: number} | undefined {
  const match = USES_PATTERN.exec(line);
  if (!match) {
    return undefined;
  }

  const actionPath = match[2]; // e.g. "actions/checkout" or "actions/cache/restore"
  const currentRef = match[3];

  const [owner, name] = actionPath.split("/");
  if (!owner || !name) {
    return undefined;
  }

  const valueStart = match.index + match[0].indexOf(match[2]);
  const valueEnd = valueStart + actionPath.length + 1 + currentRef.length; // +1 for @

  return {owner, name, currentRef, valueStart, valueEnd};
}

async function fetchLatestVersion(owner: string, name: string): Promise<ActionVersionInfo | undefined> {
  const session = await getSession(true);
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

    // Fallback: list tags and find latest semver
    try {
      const {data} = await client.repos.listTags({owner, repo: name, per_page: 10});
      if (data.length > 0) {
        // Find the latest semver-like tag
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

function extractMajorTag(tag: string): string | undefined {
  const match = /^(v?\d+)[\.\d]*/.exec(tag);
  return match ? match[1] : undefined;
}

export class ActionVersionHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const line = document.lineAt(position).text;
    const ref = parseUsesReference(line);
    if (!ref) {
      return undefined;
    }

    // Ensure cursor is within the action reference range
    if (position.character < ref.valueStart || position.character > ref.valueEnd) {
      return undefined;
    }

    const versionInfo = await fetchLatestVersion(ref.owner, ref.name);
    if (!versionInfo) {
      return undefined;
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    const isCurrentLatest = ref.currentRef === versionInfo.latest || ref.currentRef === versionInfo.latestMajor;

    if (isCurrentLatest) {
      md.appendMarkdown(`**Latest version:** \`${versionInfo.latest}\` ✓`);
    } else {
      md.appendMarkdown(`**Latest version:** \`${versionInfo.latest}\``);
      if (versionInfo.latestMajor && ref.currentRef !== versionInfo.latestMajor) {
        md.appendMarkdown(` (major: \`${versionInfo.latestMajor}\`)`);
      }
    }

    const range = new vscode.Range(position.line, ref.valueStart, position.line, ref.valueEnd);

    return new vscode.Hover(md, range);
  }
}
