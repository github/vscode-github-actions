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

export async function getGitHubUrls(): Promise<string[] | null> {
  const git = await getGitExtension();

  if (git && git.repositories.length > 0) {
    return git.repositories
      .map((r) => {
        const originRemote = r.state.remotes.filter(
          (remote) => remote.name === "origin"
        );
        if (
          originRemote.length > 0 &&
          originRemote[0].pushUrl?.indexOf("github.com") !== -1
        ) {
          return originRemote[0].pushUrl!;
        }

        return undefined;
      })
      .filter((x) => !!x) as string[];
  }

  return null;
}

export async function getGitHubProtocols(): Promise<Protocol[] | null> {
  const urls = await getGitHubUrls();

  if (urls) {
    return urls.map((url) => new Protocol(url));
  }

  return null;
}

export interface GitHubRepoContext {
  client: Octokit;

  id: number;
  owner: string;
  name: string;

  defaultBranch: string;

  ownerIsOrg: boolean;
  orgFeaturesEnabled?: boolean;
}

export interface GitHubContext {
  repos: GitHubRepoContext[];
}

let gitHubContext: Promise<GitHubContext | undefined> | undefined;

export async function getGitHubContext(): Promise<GitHubContext | undefined> {
  if (gitHubContext) {
    return gitHubContext;
  }

  try {
    const session = await getSession();
    const client = getClient(session.accessToken);

    const protocolInfos = await getGitHubProtocols();
    if (!protocolInfos) {
      return undefined;
    }

    const repos = await Promise.all(
      protocolInfos.map(async (protocolInfo): Promise<GitHubRepoContext> => {
        const repoInfo = await client.repos.get({
          repo: protocolInfo.repositoryName,
          owner: protocolInfo.owner,
        });

        return {
          client,
          name: protocolInfo.repositoryName,
          owner: protocolInfo.owner,
          id: repoInfo.data.id,
          defaultBranch: `refs/heads/${repoInfo.data.default_branch}`,
          ownerIsOrg: repoInfo.data.owner?.type === "Organization",
          orgFeaturesEnabled:
            session.scopes.find((x) => x.toLocaleLowerCase() === "admin:org") !=
            null,
        };
      })
    );

    gitHubContext = Promise.resolve({ repos });
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
