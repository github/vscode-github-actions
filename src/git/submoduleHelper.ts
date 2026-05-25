import * as vscode from "vscode";
import * as path from "path";

import {getGitExtension} from "./repository";
import {logDebug} from "../log";

async function getGitRemoteForPath(documentPath: string): Promise<string | undefined> {
  try {
    const dir = path.dirname(documentPath);
    const cp = await import("child_process");
    const util = await import("util");
    const execPromise = util.promisify(cp.exec);
    const {stdout} = await execPromise("git config --get remote.origin.url", {cwd: dir});
    return stdout.trim();
  } catch {
    return undefined;
  }
}

export async function getRepositoryRootForDocumentUri(documentUri: vscode.Uri): Promise<vscode.Uri | undefined> {
  const git = await getGitExtension();
  if (!git || git.repositories.length === 0) {
    return undefined;
  }

  const documentPath = documentUri.fsPath;

  for (const repository of git.repositories) {
    const repoPath = repository.rootUri.fsPath;

    if (documentPath.startsWith(repoPath)) {
      await repository.status();
      const state = repository.state;

      if (state && state.submodules && state.submodules.length > 0) {
        for (const submodule of state.submodules) {
          const submodulePath = path.join(repoPath, submodule.path);
          if (documentPath.startsWith(submodulePath)) {
            logDebug("Found document in submodule:", submodule.path);
            const remoteUrl = await getGitRemoteForPath(submodulePath);
            if (remoteUrl) {
              logDebug("Submodule remote URL:", remoteUrl);
            }
            return vscode.Uri.file(submodulePath);
          }
        }
      }

      logDebug("Found document in repository:", repoPath);
      return repository.rootUri;
    }
  }

  return undefined;
}
