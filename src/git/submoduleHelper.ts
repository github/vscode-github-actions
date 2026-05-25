import * as vscode from "vscode";
import * as path from "path";

import {getGitExtension} from "./repository";
import {logDebug} from "../log";

async function getGitRemoteForPath(directoryPath: string): Promise<string | undefined> {
  try {
    const fs = await import("fs/promises");
    const stats = await fs.stat(directoryPath);
    const cwd = stats.isDirectory() ? directoryPath : path.dirname(directoryPath);

    const child_process = await import("child_process");
    const util = await import("util");
    const execFile = util.promisify(child_process.execFile);
    const {stdout} = await execFile("git", ["config", "--get", "remote.origin.url"], {cwd});
    return stdout.trim();
  } catch {
    return undefined;
  }
}

function isPathWithin(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function getRepositoryRootForDocumentUri(documentUri: vscode.Uri): Promise<vscode.Uri | undefined> {
  const git = await getGitExtension();
  if (!git || git.repositories.length === 0) {
    return undefined;
  }

  const documentPath = documentUri.fsPath;

  for (const repository of git.repositories) {
    const repoPath = repository.rootUri.fsPath;

    if (isPathWithin(documentPath, repoPath)) {
      const state = repository.state;

      if (state && state.submodules && state.submodules.length > 0) {
        for (const submodule of state.submodules) {
          const submodulePath = path.join(repoPath, submodule.path);
          if (isPathWithin(documentPath, submodulePath)) {
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
