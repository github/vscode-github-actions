import * as vscode from "vscode";

import {TTLCache} from "@actions/languageserver/utils/cache";

import {getSession} from "../auth/auth";
import {getClient} from "../api/api";

const USES_PATTERN = /uses:\s*(['"]?)([^@\s'"]+)@([^\s'"#]+)/;
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new TTLCache(CACHE_TTL_MS);

interface ActionVersionInfo {
  latest: string;
  latestMajor?: string;
}

function parseUsesReference(
  line: string
): {owner: string; name: string; actionPath: string; currentRef: string; refStart: number; refEnd: number} | undefined {
  const match = USES_PATTERN.exec(line);
  if (!match) {
    return undefined;
  }

  const actionPath = match[2];
  const currentRef = match[3];

  const [owner, name] = actionPath.split("/");
  if (!owner || !name) {
    return undefined;
  }

  // Find the position of the @ref part
  const fullMatchStart = match.index + match[0].indexOf(match[2]);
  const refStart = fullMatchStart + actionPath.length + 1; // +1 for @
  const refEnd = refStart + currentRef.length;

  return {owner, name, actionPath, currentRef, refStart, refEnd};
}

function extractMajorTag(tag: string): string | undefined {
  const match = /^(v?\d+)[\.\d]*/.exec(tag);
  return match ? match[1] : undefined;
}

async function fetchLatestVersion(owner: string, name: string): Promise<ActionVersionInfo | undefined> {
  const session = await getSession(true);
  if (!session) {
    return undefined;
  }

  const cacheKey = `action-latest-version:${owner}/${name}`;
  return cache.get<ActionVersionInfo | undefined>(cacheKey, undefined, async () => {
    const client = getClient(session.accessToken);

    try {
      const {data} = await client.repos.getLatestRelease({owner, repo: name});
      if (data.tag_name) {
        const major = extractMajorTag(data.tag_name);
        return {latest: data.tag_name, latestMajor: major};
      }
    } catch {
      // No release found
    }

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

export class ActionVersionCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): Promise<vscode.CodeAction[] | undefined> {
    const actions: vscode.CodeAction[] = [];

    for (let lineNum = range.start.line; lineNum <= range.end.line; lineNum++) {
      const line = document.lineAt(lineNum).text;
      const ref = parseUsesReference(line);
      if (!ref) {
        continue;
      }

      const versionInfo = await fetchLatestVersion(ref.owner, ref.name);
      if (!versionInfo) {
        continue;
      }

      const isCurrentLatest = ref.currentRef === versionInfo.latest || ref.currentRef === versionInfo.latestMajor;

      if (isCurrentLatest) {
        continue;
      }

      const refRange = new vscode.Range(lineNum, ref.refStart, lineNum, ref.refEnd);

      // Offer update to latest full version
      const updateToLatest = new vscode.CodeAction(
        `Update ${ref.actionPath} to ${versionInfo.latest}`,
        vscode.CodeActionKind.QuickFix
      );
      updateToLatest.edit = new vscode.WorkspaceEdit();
      updateToLatest.edit.replace(document.uri, refRange, versionInfo.latest);
      updateToLatest.isPreferred = true;
      actions.push(updateToLatest);

      // Offer update to latest major version tag if different
      if (
        versionInfo.latestMajor &&
        versionInfo.latestMajor !== versionInfo.latest &&
        versionInfo.latestMajor !== ref.currentRef
      ) {
        const updateToMajor = new vscode.CodeAction(
          `Update ${ref.actionPath} to ${versionInfo.latestMajor}`,
          vscode.CodeActionKind.QuickFix
        );
        updateToMajor.edit = new vscode.WorkspaceEdit();
        updateToMajor.edit.replace(document.uri, refRange, versionInfo.latestMajor);
        actions.push(updateToMajor);
      }
    }

    return actions.length > 0 ? actions : undefined;
  }
}
