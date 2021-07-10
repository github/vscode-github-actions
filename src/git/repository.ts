import { Octokit } from "@octokit/rest";
import * as vscode from "vscode";
import { getClient } from "../api/api";
import { getSession } from "../auth/auth";
import { Protocol } from "../external/protocol";
import { API, GitExtension, RefType } from "../typings/git";

async function getGitExtension(): Promise<API | undefined> {
  const gitExtension =
    vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (gitExtension) {
    if (!gitExtension.isActive) {
      await gitExtension.activate();
    }
    const git = gitExtension.exports.getAPI(1);

    if (git.state !== "initialized") {
      // Wait for the plugin to be initialized
      await new Promise<void>((resolve) => {
        if (git.state === "initialized") {
          resolve();
        } else {
          const listener = git.onDidChangeState((state) => {
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

export async function getGitHubUrls(): Promise<
  | {
      workspaceUri: vscode.Uri;
      url: string;
      protocol: Protocol;
    }[]
  | null
> {
  const git = await getGitExtension();

  if (git && git.repositories.length > 0) {
    return git.repositories
      .map((r) => {
        // In the future we might make this configurable, but for now continue to look
        // for a remote named "origin".
        const originRemote = r.state.remotes.filter(
          (remote) => remote.name === "origin"
        );
        if (
          originRemote.length > 0 &&
          originRemote[0].pushUrl?.indexOf("github.com") !== -1
        ) {
          const url = originRemote[0].pushUrl!;

          return {
            workspaceUri: r.rootUri,
            url,
            protocol: new Protocol(url),
          };
        }

        return undefined;
      })
      .filter((x) => !!x) as any;
  }

  return null;
}

export interface GitHubRepoContext {
  client: Octokit;

  workspaceUri: vscode.Uri;

  id: number;
  owner: string;
  name: string;

  defaultBranch: string;

  ownerIsOrg: boolean;
  orgFeaturesEnabled?: boolean;
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
    const session = await getSession();
    const client = getClient(session.accessToken);

    const protocolInfos = await getGitHubUrls();
    if (!protocolInfos) {
      return undefined;
    }

    const repos = await Promise.all(
      protocolInfos.map(async (protocolInfo): Promise<GitHubRepoContext> => {
        const repoInfo = await client.repos.get({
          repo: protocolInfo.protocol.repositoryName,
          owner: protocolInfo.protocol.owner,
        });

        return {
          workspaceUri: protocolInfo.workspaceUri,
          client,
          name: protocolInfo.protocol.repositoryName,
          owner: protocolInfo.protocol.owner,
          id: repoInfo.data.id,
          defaultBranch: `refs/heads/${repoInfo.data.default_branch}`,
          ownerIsOrg: repoInfo.data.owner?.type === "Organization",
          orgFeaturesEnabled:
            session.scopes.find((x) => x.toLocaleLowerCase() === "admin:org") !=
            null,
        };
      })
    );

    gitHubContext = Promise.resolve({
      repos,
      reposByUri: new Map(repos.map((r) => [r.workspaceUri.toString(), r])),
    });
  } catch (e) {
    // Reset the context so the next attempt will try this flow again
    gitHubContext = undefined;

    // Rethrow original error
    throw e;
  }

  return gitHubContext;
}

export async function resetGitHubContext() {
  gitHubContext = undefined;
  await getGitHubContext();
}

export async function getGitHubContextForRepo(
  owner: string,
  name: string
): Promise<GitHubRepoContext | undefined> {
  const gitHubContext = await getGitHubContext();
  if (!gitHubContext) {
    return undefined;
  }

  return gitHubContext.repos.find((r) => r.owner === owner && r.name === name);
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
