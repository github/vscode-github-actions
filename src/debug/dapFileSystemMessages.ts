import type {DebugProtocol as dap} from "@vscode/debugprotocol";

export const DapFileSystemCommand = {
  Stat: "fs.stat",
  ReadFile: "fs.readFile",
  WriteFile: "fs.writeFile",
  ReadDirectory: "fs.readDirectory",
  CreateDirectory: "fs.createDirectory",
  Delete: "fs.delete",
  Rename: "fs.rename",
  Copy: "fs.copy",
  Watch: "fs.watch",
  Unwatch: "fs.unwatch"
} as const;

export const DapFileSystemEvent = {
  Changed: "fs.changed"
} as const;

export const DapFileSystemStatus = {
  Ok: "ok",
  InvalidArgs: "invalidArgs",
  NotFound: "notFound",
  Exists: "exists",
  AccessDenied: "accessDenied",
  IOError: "ioError",
  FormatError: "formatError",
  Unavailable: "unavailable",
  UnknownError: "unknownError"
} as const;
export type DapFileSystemStatus = (typeof DapFileSystemStatus)[keyof typeof DapFileSystemStatus];

export const DapFileSystemEntryType = {
  Unknown: "unknown",
  File: "file",
  Directory: "directory",
  SymbolicLink: "symbolicLink"
} as const;
export type DapFileSystemEntryType = (typeof DapFileSystemEntryType)[keyof typeof DapFileSystemEntryType];

export const DapFileChangeType = {
  Created: "created",
  Changed: "changed",
  Deleted: "deleted"
} as const;
export type DapFileChangeType = (typeof DapFileChangeType)[keyof typeof DapFileChangeType];

export const DapFileSystemContentEncoding = {
  Base64: "base64"
} as const;
export type DapFileSystemContentEncoding =
  (typeof DapFileSystemContentEncoding)[keyof typeof DapFileSystemContentEncoding];

export interface FileSystemResponseBody {
  status: DapFileSystemStatus;
}

export interface FileSystemErrorResponseBody extends FileSystemResponseBody {
  error?: dap.Message;
}

export interface FileSystemStatRequestArguments {
  path: string;
}

export interface FileSystemStatResponseBody extends FileSystemResponseBody {
  type: DapFileSystemEntryType;
  readOnly: boolean;
  ctime: number;
  mtime: number;
  size: number;
}

export interface FileSystemReadFileRequestArguments {
  path: string;
  encoding?: DapFileSystemContentEncoding;
}

export interface FileSystemReadFileResponseBody extends FileSystemResponseBody {
  content: string;
  encoding: DapFileSystemContentEncoding;
}

export interface FileSystemWriteFileRequestArguments {
  path: string;
  content: string;
  encoding?: DapFileSystemContentEncoding;
  create?: boolean;
  overwrite?: boolean;
}

export interface FileSystemReadDirectoryRequestArguments {
  path: string;
}

export interface FileSystemReadDirectoryResponseBody extends FileSystemResponseBody {
  entries: FileSystemEntry[];
}

export interface FileSystemEntry {
  name: string;
  type: DapFileSystemEntryType;
}

export interface FileSystemCreateDirectoryRequestArguments {
  path: string;
}

export interface FileSystemDeleteRequestArguments {
  path: string;
  recursive?: boolean;
}

export interface FileSystemRenameRequestArguments {
  oldPath: string;
  newPath: string;
  overwrite?: boolean;
}

export interface FileSystemCopyRequestArguments {
  sourcePath: string;
  destinationPath: string;
  overwrite?: boolean;
}

export interface FileSystemWatchRequestArguments {
  path: string;
  recursive?: boolean;
}

export interface FileSystemWatchResponseBody extends FileSystemResponseBody {
  watchId: number;
}

export interface FileSystemUnwatchRequestArguments {
  watchId: number;
}

export interface FileSystemChangeEventBody {
  watchId: number;
  changes: FileSystemChange[];
}

export interface FileSystemChange {
  type: DapFileChangeType;
  path: string;
}
