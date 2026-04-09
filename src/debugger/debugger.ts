import * as crypto from "crypto";
import * as vscode from "vscode";
import {getSession, newSession} from "../auth/auth";
import {log, logDebug, logError} from "../log";
import {validateTunnelUrl} from "./tunnelUrl";
import {WebSocketDapAdapter} from "./webSocketDapAdapter";

/** The custom debug type registered in package.json contributes.debuggers. */
export const DEBUG_TYPE = "github-actions-job";

/**
 * Extension-private store for auth tokens, keyed by a one-time session
 * nonce. Tokens are never placed in DebugConfiguration (which is readable
 * by other extensions via vscode.debug.activeDebugSession.configuration).
 */
const pendingTokens = new Map<string, string>();

/**
 * Registers the Actions Job Debugger command and debug adapter factory.
 *
 * Contributes:
 * - A command-palette command that prompts for a tunnel URL and starts a debug session.
 * - A DebugAdapterDescriptorFactory that returns an inline DAP-over-WS adapter.
 */
export function registerDebugger(context: vscode.ExtensionContext): void {
  // Register the inline adapter factory for our debug type.
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(DEBUG_TYPE, new ActionsDebugAdapterFactory())
  );

  // Register a tracker to log all DAP traffic for diagnostics.
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterTrackerFactory(DEBUG_TYPE, new ActionsDebugTrackerFactory())
  );

  // Register the connect command.
  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.debugger.connect", () => connectToDebugger())
  );
}

async function connectToDebugger(): Promise<void> {
  // 1. Prompt for the tunnel URL.
  const rawUrl = await vscode.window.showInputBox({
    title: "Connect to Actions Job Debugger",
    prompt: "Enter the debugger tunnel URL (wss://…)",
    placeHolder: "wss://xxxx-4711.region.devtunnels.ms/",
    ignoreFocusOut: true,
    validateInput: input => {
      if (!input) {
        return "A tunnel URL is required";
      }
      const result = validateTunnelUrl(input);
      return result.valid ? null : result.reason;
    }
  });

  if (!rawUrl) {
    return; // user cancelled
  }

  const validation = validateTunnelUrl(rawUrl);
  if (!validation.valid) {
    void vscode.window.showErrorMessage(`Invalid tunnel URL: ${validation.reason}`);
    return;
  }

  // 2. Acquire a GitHub auth session. The token is used as a Bearer token
  //    against the Dev Tunnel relay, which accepts VS Code's GitHub app tokens.
  //    Try silently first; fall back to prompting for sign-in if needed.
  let session = await getSession();
  if (!session) {
    try {
      session = await newSession("Sign in to GitHub to connect to the Actions job debugger.");
    } catch {
      void vscode.window.showErrorMessage(
        "GitHub authentication is required to connect to the Actions job debugger. Please sign in and try again."
      );
      return;
    }
  }

  // 3. Launch the debug session. The token is stored in extension-private
  //    memory (not in the configuration) to avoid exposing it to other extensions.
  const nonce = crypto.randomBytes(16).toString("hex");
  pendingTokens.set(nonce, session.accessToken);

  const config: vscode.DebugConfiguration = {
    type: DEBUG_TYPE,
    name: "Actions Job Debugger",
    request: "attach",
    tunnelUrl: validation.url,
    __tokenNonce: nonce
  };

  log(`Starting debug session for ${validation.url}`);

  try {
    const started = await vscode.debug.startDebugging(undefined, config);
    if (!started) {
      void vscode.window.showErrorMessage(
        "Failed to start the debug session. Check the GitHub Actions output for details."
      );
    }
  } finally {
    // Clean up if the factory hasn't consumed the token yet
    pendingTokens.delete(nonce);
  }
}

class ActionsDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
  async createDebugAdapterDescriptor(session: vscode.DebugSession): Promise<vscode.DebugAdapterDescriptor> {
    const tunnelUrl = session.configuration.tunnelUrl as string | undefined;
    const nonce = session.configuration.__tokenNonce as string | undefined;
    const token = nonce ? pendingTokens.get(nonce) : undefined;

    // Consume the token immediately so it cannot be replayed.
    if (nonce) {
      pendingTokens.delete(nonce);
    }

    if (!tunnelUrl || !token) {
      throw new Error(
        "Missing tunnel URL or authentication token. Use the 'Connect to Actions Job Debugger' command to start a session."
      );
    }

    // Re-validate the tunnel URL as defense-in-depth
    const revalidation = validateTunnelUrl(tunnelUrl);
    if (!revalidation.valid) {
      throw new Error(`Invalid debugger tunnel URL: ${revalidation.reason}`);
    }

    const adapter = new WebSocketDapAdapter(tunnelUrl, token);

    try {
      await adapter.connect();
    } catch (e) {
      adapter.dispose();
      const msg = (e as Error).message;
      logError(e as Error, "Failed to connect debugger adapter");
      throw new Error(`Could not connect to the debugger tunnel: ${msg}`);
    }

    return new vscode.DebugAdapterInlineImplementation(adapter);
  }
}

class ActionsDebugTrackerFactory implements vscode.DebugAdapterTrackerFactory {
  createDebugAdapterTracker(): vscode.DebugAdapterTracker {
    return {
      onWillReceiveMessage(message: unknown) {
        const m = message as Record<string, unknown>;
        logDebug(
          `[tracker] VS Code → DA: ${String(m.type)}${m.command ? `:${String(m.command)}` : ""} (seq ${String(m.seq)})`
        );
      },
      onDidSendMessage(message: unknown) {
        const m = message as Record<string, unknown>;
        const body = m.body as Record<string, unknown> | undefined;
        let detail = String(m.type);
        if (m.command) {
          detail += `:${String(m.command)}`;
        }
        if (m.event) {
          detail += `:${String(m.event)}`;
        }
        if (m.event === "stopped" && body) {
          detail += ` threadId=${String(body.threadId)} allThreadsStopped=${String(body.allThreadsStopped)}`;
        }
        logDebug(`[tracker] DA → VS Code: ${detail} (seq ${String(m.seq)})`);
      },
      onError(error: Error) {
        logError(error, "[tracker] DAP error");
      },
      onExit(code: number | undefined, signal: string | undefined) {
        log(`[tracker] DAP session exited: code=${String(code)} signal=${String(signal)}`);
      }
    };
  }
}
