import * as vscode from "vscode";
import {type GhaOctokit} from "../api/api";
import {canReachGitHubAPI} from "../api/canReachGitHubAPI";
import {handleSamlError} from "../api/handleSamlError";
import {getSession} from "../auth/auth";
import {getGitHubApiUri, getRemoteName, useEnterprise} from "../configuration/configuration";
import {Protocol} from "../external/protocol";
import {logDebug, logError} from "../log";
import {API, GitExtension, RefType, RepositoryState} from "../typings/git";
import {RepositoryPermission, getRepositoryPermission} from "./repository-permissions";

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

        // Try to get "origin" remote first
        let remote = r.state.remotes.filter(remote => remote.name === remoteName);

        // If "origin" does not exist, automatically get another remote
        if (r.state.remotes.length !== 0 && remote.length === 0) {
          remote = [r.state.remotes[0]];
        }

        if (
          remote.length > 0 &&
          (remote[0].pushUrl?.indexOf("github.com") !== -1 ||
            (useEnterprise() && remote[0].pushUrl?.indexOf(new URL(getGitHubApiUri()).host) !== -1) ||
            (remote[0].pushUrl ? new URL(remote[0].pushUrl).host.endsWith(".ghe.com") : false))
        ) {
          const url = remote[0].pushUrl;

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
  client: GhaOctokit;
  repositoryState: RepositoryState | undefined;

  workspaceUri: vscode.Uri;

  id: number;
  owner: string;
  name: string;

  organizationOwned: boolean;
  defaultBranch: string;
  permissionLevel: RepositoryPermission;
}

export interface GitHubContext {
  repos: GitHubRepoContext[];
  reposByUri: Map<string, GitHubRepoContext>;
  reposByOwnerAndName: Map<string, GitHubRepoContext>;
  username: string;
}

let gitHubContext: Promise<GitHubContext | undefined> | undefined;

export async function getGitHubContext(): Promise<GitHubContext | undefined> {
  if (gitHubContext) {
    return gitHubContext;
  }

  if (!(await canReachGitHubAPI())) {
    logError(new Error("Cannot fetch github context"));
    return undefined;
  }

  try {
    const git = await getGitExtension();

    const allProtocolInfos = await getGitHubUrls();

    // Filter out wiki repositories because the GET call will fail and throw an error
    const protocolInfos = allProtocolInfos?.filter(info => !info.protocol.repositoryName.match(/\.wiki$/));

    if (!protocolInfos) {
      logDebug("Could not get protocol infos");
      return undefined;
    }

    logDebug("Found protocol infos", protocolInfos.length.toString());

    const session = await getSession();
    if (!session) {
      // User is not signed in, getSession will prompt them to sign in
      return undefined;
    }
    const username = session.account.label;

    const repos = await handleSamlError(session, async (client: GhaOctokit) => {
      return await Promise.all(
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
            defaultBranch: `refs/heads/${repoInfo.data.default_branch}`,
            organizationOwned: repoInfo.data.owner.type === "Organization",
            permissionLevel: getRepositoryPermission(repoInfo.data.permissions)
          };
        })
      );
    });

    gitHubContext = Promise.resolve({
      repos,
      reposByUri: new Map(repos.map(r => [r.workspaceUri.toString(), r])),
      reposByOwnerAndName: new Map(repos.map(r => [`${r.owner}/${r.name}`.toLocaleLowerCase(), r])),
      username
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

export function resetGitHubContext() {
  gitHubContext = undefined;
}

export async function getGitHubContextForRepo(owner: string, name: string): Promise<GitHubRepoContext | undefined> {
  const gitHubContext = await getGitHubContext();
  if (!gitHubContext) {
    return undefined;
  }

  const searchKey = `${owner}/${name}`.toLocaleLowerCase();
  return gitHubContext.reposByOwnerAndName.get(searchKey);
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
