// Vendor-patched replacement for @actions/languageserver/dist/utils/action-metadata.js
// Adds a raw.githubusercontent.com fallback for full commit-SHA-pinned action refs.
// Injected via webpack alias in webpack.config.js.
// See https://github.com/github/vscode-github-actions/issues/593

import {actionIdentifier} from "@actions/languageservice/action";
import {error} from "@actions/languageservice/log";
import {parse} from "yaml";
import {errorMessage, errorStatus} from "@actions/languageserver/dist/utils/error.js";

/** Matches a full 40-character hexadecimal commit SHA. */
const SHA_RE = /^[0-9a-f]{40}$/i;

export function getActionsMetadataProvider(client, cache) {
  if (!client) {
    return undefined;
  }
  return {
    fetchActionMetadata: async action => fetchActionMetadata(client, cache, action)
  };
}

export async function fetchActionMetadata(client, cache, action) {
  const metadata = await cache.get(
    `${actionIdentifier(action)}/action-metadata`,
    undefined,
    () => getActionMetadata(client, action)
  );
  if (!metadata) {
    return undefined;
  }
  // https://docs.github.com/actions/creating-actions/metadata-syntax-for-github-actions
  return parse(metadata);
}

async function getActionMetadata(client, action) {
  let resp;
  try {
    resp = await fetchAction(client, action);
  } catch (e) {
    // When the ref is a full 40-character commit SHA the GitHub Contents API may fail even
    // though the file exists at that commit (e.g. certain GHES / proxy configurations).
    // Retry against raw.githubusercontent.com, which resolves commit SHAs reliably, before
    // giving up and emitting the "repository or version not found" diagnostic.
    // See https://github.com/github/vscode-github-actions/issues/593
    if (SHA_RE.test(action.ref)) {
      const raw = await fetchActionFromRaw(action);
      if (raw !== undefined) {
        return raw;
      }
    }
    error(`Failed to fetch action metadata for ${actionIdentifier(action)}: '${errorMessage(e)}'`);
    return;
  }

  // https://docs.github.com/rest/repos/contents?apiVersion=2022-11-28
  // Ignore directories (array of files) and non-file content
  if (resp.data === undefined || Array.isArray(resp.data) || resp.data.type !== "file") {
    return undefined;
  }
  if (resp.data.content === undefined) {
    return undefined;
  }
  return Buffer.from(resp.data.content, "base64").toString("utf8");
}

/**
 * Fetches action.yml / action.yaml directly from raw.githubusercontent.com.
 *
 * Used as a fallback when the Contents API fails for a full commit SHA ref.
 * Returns the raw file content string, or undefined if neither manifest is found.
 */
async function fetchActionFromRaw(action) {
  const base = `https://raw.githubusercontent.com/${action.owner}/${action.name}/${action.ref}`;
  const manifests = action.path
    ? [`${action.path}/action.yml`, `${action.path}/action.yaml`]
    : ["action.yml", "action.yaml"];

  for (const manifest of manifests) {
    try {
      const resp = await fetch(`${base}/${manifest}`);
      if (resp.ok) {
        return await resp.text();
      }
    } catch {
      // Try the next manifest filename
    }
  }
  return undefined;
}

async function fetchAction(client, action) {
  try {
    return await client.repos.getContent({
      owner: action.owner,
      repo: action.name,
      ref: action.ref,
      path: action.path ? `${action.path}/action.yml` : "action.yml"
    });
  } catch (e) {
    // If action.yml doesn't exist, try action.yaml
    if (errorStatus(e) === 404) {
      return await client.repos.getContent({
        owner: action.owner,
        repo: action.name,
        ref: action.ref,
        path: action.path ? `${action.path}/action.yaml` : "action.yaml"
      });
    } else {
      throw e;
    }
  }
}
