import * as vscode from "vscode";

import {
  DapFileChangeType,
  DapFileSystemCommand,
  DapFileSystemContentEncoding,
  DapFileSystemEntryType,
  DapFileSystemEvent,
  DapFileSystemStatus,
  type FileSystemErrorResponseBody,
  type FileSystemChangeEventBody,
  type FileSystemCreateDirectoryRequestArguments,
  type FileSystemDeleteRequestArguments,
  type FileSystemReadDirectoryRequestArguments,
  type FileSystemReadDirectoryResponseBody,
  type FileSystemReadFileRequestArguments,
  type FileSystemReadFileResponseBody,
  type FileSystemStatRequestArguments,
  type FileSystemStatResponseBody,
  type FileSystemRenameRequestArguments,
  type FileSystemCopyRequestArguments,
  type FileSystemUnwatchRequestArguments,
  type FileSystemWatchRequestArguments,
  type FileSystemWatchResponseBody,
  type FileSystemWriteFileRequestArguments,
  FileSystemResponseBody
} from "./dapFileSystemMessages";
import {DEBUG_SESSION_TYPE} from "./workflowDebug";

export class WorkflowDebugFileSystemProvider implements vscode.FileSystemProvider, vscode.Disposable {
  private readonly onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile = this.onDidChangeFileEmitter.event;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly scheme: string) {
    this.disposables.push(
      vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
        if (event.session.type !== DEBUG_SESSION_TYPE || event.event !== DapFileSystemEvent.Changed) {
          return;
        }

        const body = event.body as FileSystemChangeEventBody | undefined;
        if (!body?.changes?.length) {
          return;
        }

        const changes = body.changes
          .map(change => ({
            type: toVsCodeFileChangeType(change.type),
            uri: vscode.Uri.from({scheme: this.scheme, path: toUriPath(change.path)})
          }))
          .filter(change => change.type !== undefined);

        if (changes.length) {
          this.onDidChangeFileEmitter.fire(changes as vscode.FileChangeEvent[]);
        }
      })
    );
  }

  dispose(): void {
    this.onDidChangeFileEmitter.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  watch(uri: vscode.Uri, options: {recursive: boolean}): vscode.Disposable {
    const path = uri.path || "/";
    const request: FileSystemWatchRequestArguments = {path, recursive: options.recursive};
    const watchIdPromise = this.sendRequest<FileSystemWatchResponseBody>(DapFileSystemCommand.Watch, request)
      .then(body => body.watchId)
      .catch(() => undefined);

    return new vscode.Disposable(() => {
      void watchIdPromise.then(watchId => {
        if (watchId === undefined) {
          return;
        }

        const unwatchRequest: FileSystemUnwatchRequestArguments = {watchId};
        void this.sendRequest(DapFileSystemCommand.Unwatch, unwatchRequest).catch(() => undefined);
      });
    });
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const request: FileSystemStatRequestArguments = {path: uri.path};
    const body = await this.sendRequest<FileSystemStatResponseBody>(DapFileSystemCommand.Stat, request);
    return {
      type: toVsCodeFileType(body.type),
      ctime: body.ctime,
      mtime: body.mtime,
      size: body.size,
      permissions: body.readOnly ? vscode.FilePermission.Readonly : undefined
    };
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const request: FileSystemReadDirectoryRequestArguments = {path: uri.path};
    const body = await this.sendRequest<FileSystemReadDirectoryResponseBody>(
      DapFileSystemCommand.ReadDirectory,
      request
    );

    return body.entries.map(entry => [entry.name, toVsCodeFileType(entry.type)]);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    const request: FileSystemCreateDirectoryRequestArguments = {path: uri.path};
    await this.sendRequest(DapFileSystemCommand.CreateDirectory, request);
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const request: FileSystemReadFileRequestArguments = {
      path: uri.path,
      encoding: DapFileSystemContentEncoding.Base64
    };
    const body = await this.sendRequest<FileSystemReadFileResponseBody>(DapFileSystemCommand.ReadFile, request);
    return decodeBase64(body.content);
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array, options: {create: boolean; overwrite: boolean}): Promise<void> {
    const request: FileSystemWriteFileRequestArguments = {
      path: uri.path,
      content: encodeBase64(content),
      encoding: DapFileSystemContentEncoding.Base64,
      create: options.create,
      overwrite: options.overwrite
    };
    await this.sendRequest(DapFileSystemCommand.WriteFile, request);
  }

  async delete(uri: vscode.Uri, options: {recursive: boolean}): Promise<void> {
    const request: FileSystemDeleteRequestArguments = {path: uri.path, recursive: options.recursive};
    await this.sendRequest(DapFileSystemCommand.Delete, request);
  }

  async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: {overwrite: boolean}): Promise<void> {
    const request: FileSystemRenameRequestArguments = {
      oldPath: oldUri.path,
      newPath: newUri.path,
      overwrite: options.overwrite
    };
    await this.sendRequest(DapFileSystemCommand.Rename, request);
  }

  async copy(source: vscode.Uri, destination: vscode.Uri, options: {overwrite: boolean}): Promise<void> {
    const request: FileSystemCopyRequestArguments = {
      sourcePath: source.path,
      destinationPath: destination.path,
      overwrite: options.overwrite
    };
    await this.sendRequest(DapFileSystemCommand.Copy, request);
  }

  private async sendRequest<T extends FileSystemResponseBody = FileSystemResponseBody>(
    command: string,
    args: unknown
  ): Promise<T> {
    const session = vscode.debug.activeDebugSession;
    if (!session || session.type !== DEBUG_SESSION_TYPE) {
      throw vscode.FileSystemError.Unavailable("No active GitHub Actions debug session.");
    }

    const responseBody: T = await session.customRequest(command, args);

    if (responseBody?.status && responseBody.status !== DapFileSystemStatus.Ok) {
      throw toFileSystemError(responseBody as FileSystemErrorResponseBody);
    }

    return responseBody as T;
  }
}

function toVsCodeFileType(type: DapFileSystemEntryType): vscode.FileType {
  switch (type) {
    case DapFileSystemEntryType.File:
      return vscode.FileType.File;
    case DapFileSystemEntryType.Directory:
      return vscode.FileType.Directory;
    case DapFileSystemEntryType.SymbolicLink:
      return vscode.FileType.SymbolicLink;
    default:
      return vscode.FileType.Unknown;
  }
}

function toVsCodeFileChangeType(type: DapFileChangeType): vscode.FileChangeType | undefined {
  switch (type) {
    case DapFileChangeType.Created:
      return vscode.FileChangeType.Created;
    case DapFileChangeType.Changed:
      return vscode.FileChangeType.Changed;
    case DapFileChangeType.Deleted:
      return vscode.FileChangeType.Deleted;
    default:
      return undefined;
  }
}

function toUriPath(remotePath: string): string {
  if (!remotePath) {
    return "/";
  }
  return remotePath.startsWith("/") ? remotePath : `/${remotePath}`;
}

function decodeBase64(content: string): Uint8Array {
  return Uint8Array.from(Buffer.from(content, "base64"));
}

function encodeBase64(content: Uint8Array): string {
  return Buffer.from(content).toString("base64");
}

function toFileSystemError(error: FileSystemErrorResponseBody): vscode.FileSystemError {
  const message = error.error?.format ?? "An unknown file system error occurred.";

  switch (error.status) {
    case DapFileSystemStatus.NotFound:
      return vscode.FileSystemError.FileNotFound(message);
    case DapFileSystemStatus.Exists:
      return vscode.FileSystemError.FileExists(message);
    case DapFileSystemStatus.AccessDenied:
      return vscode.FileSystemError.NoPermissions(message);
    case DapFileSystemStatus.IOError:
    case DapFileSystemStatus.Unavailable:
      return vscode.FileSystemError.Unavailable(message);
    case DapFileSystemStatus.FormatError:
    case DapFileSystemStatus.InvalidArgs:
    default:
      return new vscode.FileSystemError(message);
  }
}
