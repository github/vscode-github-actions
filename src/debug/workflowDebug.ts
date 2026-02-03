import * as crypto from "crypto";
import * as path from "path";
import * as vscode from "vscode";
import type {DebugProtocol as dap} from "@vscode/debugprotocol";

import {registerWorkflowDebugProviders} from "./workflowDebugTree";

export const DEBUG_SESSION_TYPE = "github-actions";

const DEFAULT_DEBUG_HOST = "127.0.0.1";
const DEFAULT_DEBUG_PORT = 4711;

// The workflow debug adapter currently uses only sha256 checksums.
const CHECKSUM_ALGORITHM = "sha256";

export function registerWorkflowDebugging(context: vscode.ExtensionContext) {
  registerWorkflowDebugProviders(context);

  const activeSessions = new Set<string>();
  const updateDebuggingContext = async () => {
    await vscode.commands.executeCommand("setContext", "github-actions.debugging", activeSessions.size > 0);
  };

  const handleStart = (session: vscode.DebugSession) => {
    if (session.type !== DEBUG_SESSION_TYPE) {
      return;
    }
    activeSessions.add(session.id);
    void updateDebuggingContext();
  };

  const handleTerminate = (session: vscode.DebugSession) => {
    if (session.type !== DEBUG_SESSION_TYPE) {
      return;
    }
    activeSessions.delete(session.id);
    void updateDebuggingContext();
  };

  if (vscode.debug.activeDebugSession?.type === DEBUG_SESSION_TYPE) {
    activeSessions.add(vscode.debug.activeDebugSession.id);
  }

  void updateDebuggingContext();

  context.subscriptions.push(vscode.debug.onDidStartDebugSession(handleStart));
  context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(handleTerminate));

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(DEBUG_SESSION_TYPE, new WorkflowDebugAdapterDescriptorFactory())
  );

  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(DEBUG_SESSION_TYPE, new WorkflowDebugConfigurationProvider())
  );

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterTrackerFactory(DEBUG_SESSION_TYPE, new WorkflowDebugAdapterTrackerFactory())
  );
}

class WorkflowDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    const port = Number(session.configuration.port) || DEFAULT_DEBUG_PORT;
    const host = session.configuration.host || DEFAULT_DEBUG_HOST;
    return new vscode.DebugAdapterServer(port, host);
  }
}

class WorkflowDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  resolveDebugConfiguration(
    _folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    if (!config.type) {
      config.type = DEBUG_SESSION_TYPE;
    }

    if (!config.request) {
      config.request = "attach";
    }

    if (!config.name) {
      config.name = "GitHub Actions";
    }

    return config;
  }
}

class WorkflowDebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
  createDebugAdapterTracker(session: vscode.DebugSession): vscode.DebugAdapterTracker {
    const debugToLocalPaths = new Map<string, string>();
    const localToDebugPaths = new Map<string, string>();
    const pendingResolutions = new Map<string, Promise<void>>();

    // Get identity from session configuration (passed from attachWorkflowJobDebugger)
    const config = session.configuration;
    const githubActor = config.githubActor || "unknown";
    const githubRepository = config.githubRepository || "unknown";
    const githubRunID = config.githubRunID || "unknown";
    const githubJobID = config.githubJobID || "";

    // Precompute workflow file checksums to enable mapping repo-relative DAP sources to
    // local files on first stack trace.
    let precomputedIndex: Map<string, Array<{fsPath: string; checksum: string}>> | undefined;
    void buildWorkflowChecksumIndex().then(index => {
      precomputedIndex = index;
    });

    return {
      // Apply transformations to messages as they are sent to the debug adapter.
      onWillReceiveMessage: (message: dap.ProtocolMessage) => {
        // Inject identity fields into initialize request for DAP proxy
        if (isDapRequest(message) && (message as dap.Request).command === "initialize") {
          const initRequest = message as dap.InitializeRequest;
          const args = initRequest.arguments as unknown as Record<string, unknown>;
          args.githubActor = githubActor;
          args.githubRepository = githubRepository;
          args.githubRunID = githubRunID;
          args.githubJobID = githubJobID;
        }

        transformSentSourcePaths(message, {
          debugToLocalPaths,
          localToDebugPaths,
          pendingResolutions,
          precomputedIndex
        });
      },
      // Apply transformations to messages as they are received from the debug adapter.
      onDidSendMessage: (message: dap.ProtocolMessage) => {
        if (isDapResponse(message) && message.command === "initialize") {
          const initResponseBody = (message as dap.InitializeResponse).body;
          if (initResponseBody) {
            // Report that the debug adapter supports restart requests, so that VS Code will
            // try to send them instead of terminate+launch when the user clicks "Restart".
            // An error response is expected, and the restart will be blocked.
            initResponseBody.supportsRestartRequest = true;
          }
        }

        transformReceivedSourcePaths(message, {
          debugToLocalPaths,
          localToDebugPaths,
          pendingResolutions,
          precomputedIndex
        });
      }
    };
  }
}

type StackTraceTransformContext = {
  debugToLocalPaths: Map<string, string>;
  localToDebugPaths: Map<string, string>;
  pendingResolutions: Map<string, Promise<void>>;
  precomputedIndex?: Map<string, Array<{fsPath: string; checksum: string}>>;
};

function isDapRequest(message: dap.ProtocolMessage): message is dap.Request {
  return message.type === "request";
}

function isDapResponse(message: dap.ProtocolMessage): message is dap.Response {
  return message.type === "response";
}

function isDapEvent(message: dap.ProtocolMessage): message is dap.Event {
  return message.type === "event";
}

/**
 * Replace repo-relative source paths with local workspace file paths, if the checksum matches,
 * when receiving messages from the debug adapter.
 */
function transformReceivedSourcePaths(message: dap.ProtocolMessage, context: StackTraceTransformContext): void {
  if (isDapResponse(message) && message.command === "stackTrace") {
    const stackFrames = (message as dap.StackTraceResponse).body?.stackFrames;
    if (Array.isArray(stackFrames)) {
      for (const frame of stackFrames) {
        transformReceivedSourcePath(frame?.source, context);
      }
    }
  } else if (isDapResponse(message) && message.command === "setBreakpoints") {
    const breakpoints = (message as dap.SetBreakpointsResponse).body?.breakpoints;
    if (Array.isArray(breakpoints)) {
      for (const breakpoint of breakpoints) {
        transformReceivedSourcePath(breakpoint?.source, context);
      }
    }
  } else if (isDapResponse(message) && message.command === "scopes") {
    const scopes = (message as dap.ScopesResponse).body?.scopes;
    if (Array.isArray(scopes)) {
      for (const scope of scopes) {
        transformReceivedSourcePath(scope?.source, context);
      }
    }
  } else if (isDapEvent(message) && message.event === "output") {
    const source = (message as dap.OutputEvent).body?.source;
    transformReceivedSourcePath(source, context);
  }
}

function transformReceivedSourcePath(source: dap.Source | undefined, context: StackTraceTransformContext): void {
  if (!source || !source.path) {
    return;
  }

  const repoPath = normalizeRepoRelativePath(source.path);
  if (!repoPath || path.isAbsolute(repoPath)) {
    return;
  }

  const checksum = source.checksums && source.checksums[0];
  if (
    !checksum ||
    typeof checksum.checksum !== "string" ||
    typeof checksum.algorithm !== "string" ||
    checksum.algorithm.toLowerCase() !== CHECKSUM_ALGORITHM
  ) {
    return;
  }

  const cachedPath = context.debugToLocalPaths.get(repoPath);
  if (cachedPath) {
    // Fast path: reuse an already-mapped repo-relative path.
    context.localToDebugPaths.set(cachedPath, repoPath);
    source.path = cachedPath;
    source.sourceReference = 0;
    if (!source.name) {
      source.name = path.basename(cachedPath);
    }
    return;
  }

  if (context.precomputedIndex) {
    // Use the precomputed checksum index to map without hitting the filesystem.
    const candidates = context.precomputedIndex.get(repoPath);
    const match = candidates?.find(entry => equalsIgnoreCase(entry.checksum, checksum.checksum));
    if (match) {
      context.debugToLocalPaths.set(repoPath, match.fsPath);
      context.localToDebugPaths.set(match.fsPath, repoPath);
      source.path = match.fsPath;
      source.sourceReference = 0;
      if (!source.name) {
        source.name = path.basename(match.fsPath);
      }
      return;
    }
  }

  if (!context.pendingResolutions.has(repoPath)) {
    // Fallback: resolve the file by hashing it on demand and cache the result.
    context.pendingResolutions.set(
      repoPath,
      resolveLocalSourcePath(repoPath, checksum.checksum).then(resolved => {
        if (resolved) {
          context.debugToLocalPaths.set(repoPath, resolved);
          context.localToDebugPaths.set(resolved, repoPath);
        }
        context.pendingResolutions.delete(repoPath);
      })
    );
  }
}

/**
 * Replace local workspace file paths with repo-relative source paths when sending requests
 * to the adapter.
 */
function transformSentSourcePaths(message: dap.ProtocolMessage, context: StackTraceTransformContext): void {
  if (!isDapRequest(message)) {
    return;
  }

  let source: dap.Source | undefined;
  if (message.command === "setBreakpoints") {
    source = (message as dap.SetBreakpointsRequest).arguments?.source as dap.Source | undefined;
  } else if (message.command === "breakpointLocations") {
    source = (message as dap.BreakpointLocationsRequest).arguments?.source as dap.Source | undefined;
  } else if (message.command === "evaluate") {
    source = (message as dap.EvaluateRequest).arguments?.source as dap.Source | undefined;
  }

  transformSentSourcePath(source, context);
}

function transformSentSourcePath(source: dap.Source | undefined, context: StackTraceTransformContext): void {
  if (source?.path) {
    const repoPath = mapLocalPathToRepoRelative(source.path, context.localToDebugPaths);
    if (repoPath) {
      source.path = repoPath;
    }
  }
}

function mapLocalPathToRepoRelative(localPath: string, localToDebugPaths: Map<string, string>): string | undefined {
  const normalized = path.normalize(localPath);
  const cached = localToDebugPaths.get(normalized);
  if (cached) {
    return cached;
  }

  if (!path.isAbsolute(normalized)) {
    return undefined;
  }

  const uri = vscode.Uri.file(normalized);
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    return undefined;
  }

  const relative = path.posix.relative(folder.uri.path, uri.path).replace(/^\/+/, "");
  return normalizeRepoRelativePath(relative);
}

function normalizeRepoRelativePath(rawPath: string): string | undefined {
  if (!rawPath) {
    return undefined;
  }

  const normalized = rawPath.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    return normalized.slice(1);
  }

  return normalized;
}

function equalsIgnoreCase(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.localeCompare(right, undefined, {sensitivity: "accent"}) === 0;
}

async function resolveLocalSourcePath(repoPath: string, checksum: string): Promise<string | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    const uri = joinRepoPath(folder.uri, repoPath);
    if (!uri) {
      continue;
    }

    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const localChecksum = computeChecksum(content);
      if (equalsIgnoreCase(localChecksum, checksum)) {
        return uri.fsPath;
      }
    } catch {
      // Ignore and try next folder
    }
  }

  return undefined;
}

async function buildWorkflowChecksumIndex(): Promise<Map<string, Array<{fsPath: string; checksum: string}>>> {
  const index = new Map<string, Array<{fsPath: string; checksum: string}>>();
  const workflowFiles = await vscode.workspace.findFiles(
    "**/.github/workflows/*.{yml,yaml}",
    "**/node_modules/**",
    200
  );

  for (const uri of workflowFiles) {
    const repoPath = getRepoRelativePath(uri);
    if (!repoPath) {
      continue;
    }

    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const checksum = computeChecksum(content);
      const entries = index.get(repoPath) ?? [];
      entries.push({fsPath: uri.fsPath, checksum});
      index.set(repoPath, entries);
    } catch {
      // Ignore unreadable files
    }
  }

  return index;
}

function computeChecksum(content: Uint8Array): string {
  const normalized = normalizeLineEndings(content);
  return crypto.createHash(CHECKSUM_ALGORITHM).update(normalized).digest("hex");
}

/**
 * Normalize line endings before checksum computation. This avoids checksum
 * mismatches due to git's 'autocrlf' or other line ending conversions.
 */
function normalizeLineEndings(content: Uint8Array): Uint8Array {
  let hasCrlf = false;
  for (let i = 0; i < content.length - 1; i++) {
    if (content[i] === 13 && content[i + 1] === 10) {
      hasCrlf = true;
      break;
    }
  }

  if (!hasCrlf) {
    return content;
  }

  const stripped: number[] = [];
  for (let i = 0; i < content.length; i++) {
    const byte = content[i];
    if (byte === 13 && content[i + 1] === 10) {
      continue;
    }
    stripped.push(byte);
  }

  return Uint8Array.from(stripped);
}

function getRepoRelativePath(uri: vscode.Uri): string | undefined {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    return undefined;
  }

  const relative = path.posix.relative(folder.uri.path, uri.path).replace(/^\/+/, "");
  return normalizeRepoRelativePath(relative);
}

function joinRepoPath(base: vscode.Uri, repoPath: string): vscode.Uri | undefined {
  const segments = repoPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }

  return vscode.Uri.joinPath(base, ...segments);
}
