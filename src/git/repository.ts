import * as vscode from "vscode";

import {logDebug, logError} from "../log";
import {API, GitExtension, RefType, RepositoryState} from "../typings/git";

import {Octokit} from "@octokit/rest";
import {getClient} from "../api/api";
import {getSession} from "../auth/auth";
import {getRemoteName} from "../configuration/configuration";
import {Protocol} from "../external/protocol";

interface GitHubUrls {
  workspaceUri: vscode.Uri;
  url: string;
  protocol: Protocol;
}

async function getGitExtension(): Promise<API | undefined> {
  const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (gitExtension) {
    if (!gitExtension.isActive) {
      await gitExtension.activate();
    }
    const git = gitExtension.exports.getAPI(1);

    if (git.state !== "initialized") {
      // Wait for the plugin to be initialized
      await new Promise<void>(resolve => {
        if (git.state === "initialized") {
          resolve();
        } else {
          const listener = git.onDidChangeState(state => {
            if (state === "initialized") {
              resolve();
            }
            listener.dispose();
          });
        }
      });
    }

    return git;
  }
}

export async function getGitHead(): Promise<string | undefined> {
  const git = await getGitExtension();
  if (git && git.repositories.length > 0) {
    const head = git.repositories[0].state.HEAD;
    if (head && head.name && head.type === RefType.Head) {
      return `refs/heads/${head.name}`;
    }
  }
}

export async function getGitHubUrls(): Promise<GitHubUrls[] | null> {
  const git = await getGitExtension();
  if (git && git.repositories.length > 0) {
    logDebug("Found git extension");

    const remoteName = getRemoteName();

    const p = await Promise.all(
      git.repositories.map(async r => {
        logDebug("Find `origin` remote for repository", r.rootUri.path);
        await r.status();

        const originRemote = r.state.remotes.filter(remote => remote.name === remoteName);
        if (originRemote.length > 0 && originRemote[0].pushUrl?.indexOf("github.com") !== -1) {
          const url = originRemote[0].pushUrl;

          return {
            workspaceUri: r.rootUri,
            url,
            protocol: new Protocol(url as string)
          };
        }

        logDebug(`Remote "${remoteName}" not found, skipping repository`);

        return undefined;
      })
    );
    return p.filter(x => !!x) as GitHubUrls[];
  }

  // If we cannot find the git extension, assume for now that we are running a web context,
  // for instance, github.dev. I think ideally we'd check the workspace URIs first, but this
  // works for now. We'll revisit later.
  // if (!git) {
  // Support for virtual workspaces
  const isVirtualWorkspace =
    vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.every(f => f.uri.scheme !== "file");
  if (isVirtualWorkspace) {
    logDebug("Found virtual workspace");

    const ghFolder = vscode.workspace.workspaceFolders?.find(
      x => x.uri.scheme === "vscode-vfs" && x.uri.authority === "github"
    );
    if (ghFolder) {
      logDebug("Found virtual GitHub workspace folder");

      const url = `https://github.com/${ghFolder.uri.path}`;

      const urls: [GitHubUrls] = [
        {
          workspaceUri: ghFolder.uri,
          url: url,
          protocol: new Protocol(url)
        }
      ];

      return urls;
    }
  }

  return null;
}

export interface GitHubRepoContext {
  client: Octokit;
  repositoryState: RepositoryState | undefined;

  workspaceUri: vscode.Uri;

  id: number;
  owner: string;
  name: string;

  defaultBranch: string;
}

export interface GitHubContext {
  repos: GitHubRepoContext[];
  reposByUri: Map<string, GitHubRepoContext>;
}

let gitHubContext: Promise<GitHubContext | undefined> | undefined;

export async function getGitHubContext(): Promise<GitHubContext | undefined> {
  if (gitHubContext) {
    return gitHubContext;
  }

  try {
    const git = await getGitExtension();
    const session = await getSession();
    const client = getClient(session.accessToken);

    const protocolInfos = await getGitHubUrls();
    if (!protocolInfos) {
      logDebug("Could not get protocol infos");
      return undefined;
    }

    logDebug("Found protocol infos", protocolInfos.length.toString());

    const repos = await Promise.all(
      protocolInfos.map(async (protocolInfo): Promise<GitHubRepoContext> => {
        logDebug("Getting infos for repository", protocolInfo.url);

        const repoInfo = await client.repos.get({
          repo: protocolInfo.protocol.repositoryName,
          owner: protocolInfo.protocol.owner
        });

        const repo = git && git.getRepository(protocolInfo.workspaceUri);

        return {
          workspaceUri: protocolInfo.workspaceUri,
          client,
          repositoryState: repo?.state,
          name: protocolInfo.protocol.repositoryName,
          owner: protocolInfo.protocol.owner,
          id: repoInfo.data.id,
          defaultBranch: `refs/heads/${repoInfo.data.default_branch}`
        };
      })
    );

    gitHubContext = Promise.resolve({
      repos,
      reposByUri: new Map(repos.map(r => [r.workspaceUri.toString(), r]))
    });
  } catch (e) {
    // Reset the context so the next attempt will try this flow again
    gitHubContext = undefined;

    logError(e as Error, "Error getting GitHub context");

    // Rethrow original error
    throw e;
  }

  return gitHubContext;
}

export async function getGitHubContextForRepo(owner: string, name: string): Promise<GitHubRepoContext | undefined> {
  const gitHubContext = await getGitHubContext();
  if (!gitHubContext) {
    return undefined;
  }

  return gitHubContext.repos.find(r => r.owner === owner && r.name === name);
}

export async function getGitHubContextForWorkspaceUri(
  workspaceUri: vscode.Uri
): Promise<GitHubRepoContext | undefined> {
  const gitHubContext = await getGitHubContext();
  if (!gitHubContext) {
    return undefined;
  }

  return gitHubContext.reposByUri.get(workspaceUri.toString());
}

export async function getGitHubContextForDocumentUri(documentUri: vscode.Uri): Promise<GitHubRepoContext | undefined> {
  const gitHubContext = await getGitHubContext();
  if (!gitHubContext) {
    return undefined;
  }

  const workspaceUri = vscode.workspace.getWorkspaceFolder(documentUri);
  if (!workspaceUri) {
    return;
  }

  return getGitHubContextForWorkspaceUri(workspaceUri.uri);
}

export function getCurrentBranch(state: RepositoryState | undefined): string | undefined {
  if (!state) {
    return;
  }

  const head = state.HEAD;
  if (!head) {
    return;
  }

  if (head.type != RefType.Head) {
    return;
  }

  return head.name;
}
