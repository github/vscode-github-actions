import { Octokit } from "@octokit/rest";
import * as vscode from "vscode";
import { getClient } from "../api/api";
import { getPAT } from "../auth/pat";
import { Protocol } from "../external/protocol";
import { GitExtension } from "../typings/git";
import { flatten } from "../utils/array";

export async function getGitHubUrl(): Promise<string | null> {
  const gitExtension = vscode.extensions.getExtension<GitExtension>(
    "vscode.git"
  );
  if (gitExtension) {
    if (!gitExtension.isActive) {
      await gitExtension.activate();
    }
    const git = gitExtension.exports.getAPI(1);

    if (git.state !== "initialized") {
      // Wait for the plugin to be initialized
      await new Promise((resolve) => {
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

    if (git.repositories.length > 0) {
      // To keep it very simple for now, look for the first remote in the current workspace that is a
      // github.com remote. This will be the repository for the workflow explorer.
      const originRemotes = flatten(
        git.repositories.map((r) =>
          r.state.remotes.filter((remote) => remote.name === "origin")
        )
      );

      const githubRemotes = originRemotes.filter(
        (x) => x.pushUrl?.indexOf("github.com") !== -1
      );
      if (githubRemotes.length > 0) {
        return githubRemotes[0].pushUrl!;
      }
    }
  }

  return null;
}

export async function getGitHubProtocol(): Promise<Protocol | null> {
  const url = await getGitHubUrl();

  if (url) {
    return new Protocol(url);
  }

  return null;
}

export interface GitHubContext {
  client: Octokit;

  owner: string;
  name: string;

  ownerIsOrg: boolean;
}

let gitHubContext: Promise<GitHubContext | undefined> | undefined;

export async function getGitHubContext(): Promise<GitHubContext | undefined> {
  if (!gitHubContext) {
    gitHubContext = (async (): Promise<GitHubContext | undefined> => {
      const token = await getPAT();
      if (!token) {
        throw new Error("Token required");
      }

      const protocolInfo = await getGitHubProtocol();
      if (!protocolInfo) {
        return undefined;
      }

      const client = getClient(token);
      const repoInfo = await client.repos.get({
        repo: protocolInfo.repositoryName,
        owner: protocolInfo.owner,
      });

      return {
        client,
        name: protocolInfo.repositoryName,
        owner: protocolInfo.owner,
        ownerIsOrg: repoInfo.data.owner.type === "Organization",
      };
    })();
  }

  return gitHubContext;
}
