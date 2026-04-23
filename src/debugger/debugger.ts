import * as crypto from "crypto";
import * as vscode from "vscode";
import {getClient} from "../api/api";
import {getSession, newSession} from "../auth/auth";
import {getGitHubApiUri} from "../configuration/configuration";
import {log, logDebug, logError} from "../log";
import {parseJobUrl} from "./jobUrl";
import {validateTunnelUrl} from "./tunnelUrl";
import {WebSocketDapAdapter} from "./webSocketDapAdapter";

export const DEBUG_TYPE = "github-actions-job";

/**
 * Extension-private token store keyed by one-time nonce. Tokens are never
 * placed in DebugConfiguration (readable by other extensions).
 */
const pendingTokens = new Map<string, string>();

export function registerDebugger(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(DEBUG_TYPE, new ActionsDebugAdapterFactory())
  );

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterTrackerFactory(DEBUG_TYPE, new ActionsDebugTrackerFactory())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("github-actions.debugger.connect", () => connectToDebugger())
  );
}

async function connectToDebugger(): Promise<void> {
  const rawUrl = await vscode.window.showInputBox({
    title: "Connect to Actions Job Debugger",
    prompt: "Paste the URL of the Actions job to debug",
    placeHolder: "https://github.com/owner/repo/actions/runs/123/job/456",
    ignoreFocusOut: true,
    validateInput: input => {
      if (!input) {
        return "A job URL is required";
      }
      const result = parseJobUrl(input, getGitHubApiUri());
      return result.valid ? null : result.reason;
    }
  });

  if (!rawUrl) {
    return;
  }

  const parsed = parseJobUrl(rawUrl, getGitHubApiUri());
  if (!parsed.valid) {
    void vscode.window.showErrorMessage(`Invalid job URL: ${parsed.reason}`);
    return;
  }

  // Try silently first; fall back to prompting for sign-in if needed.
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

  const token = session.accessToken;

  // Diagnostic: log token shape (prefix + length) and session scopes to help
  // diagnose devtunnel 403 errors. `ghu_` = VS Code GitHub App user-to-server
  // token (accepted by devtunnels); `gho_`/`ghp_` = OAuth/PAT (may be rejected).
  // The full token is never logged.
  log(
    `[debugger] Using session: tokenPrefix=${token.slice(0, 4)} tokenLen=${token.length} ` +
      `scopes=[${session.scopes.join(",")}] account=${session.account.label}`
  );

  // Diagnostic probe: silently check if a scope-less GitHub session exists.
  // Dev Tunnels only trusts VS Code GitHub App tokens (`ghu_`). A scope-less
  // session is always backed by the App, so if its prefix differs from the
  // one above we know the requested scopes forced VS Code onto the OAuth
  // app path (which returns `gho_` and gets rejected by the tunnel).
  try {
    const appSession = await vscode.authentication.getSession("github", [], {createIfNone: false, silent: true});
    if (appSession) {
      log(
        `[debugger] App-backed session probe: tokenPrefix=${appSession.accessToken.slice(0, 4)} ` +
          `tokenLen=${appSession.accessToken.length} scopes=[${appSession.scopes.join(",")}] ` +
          `sameAsAbove=${appSession.accessToken === token}`
      );
    } else {
      log(`[debugger] App-backed session probe: no scope-less session cached`);
    }
  } catch (e) {
    log(`[debugger] App-backed session probe failed: ${(e as Error).message}`);
  }

  let debuggerUrl: string;
  try {
    debuggerUrl = await vscode.window.withProgress(
      {location: vscode.ProgressLocation.Notification, title: "Connecting to Actions job debugger…"},
      async () => {
        const octokit = getClient(token);
        const response = await octokit.request("GET /repos/{owner}/{repo}/actions/jobs/{job_id}/debugger", {
          owner: parsed.owner,
          repo: parsed.repo,
          job_id: parsed.jobId
        });
        // Diagnostic: log top-level fields in the API response. If the API
        // returns a tunnel-specific access token (separate from the GitHub
        // token), we'd see it here and can switch the WS to use it.
        if (response.data && typeof response.data === "object") {
          const keys = Object.keys(response.data as object);
          log(`[debugger] /debugger API response fields: [${keys.join(", ")}]`);
        }
        return (response.data as {debugger_url: string}).debugger_url;
      }
    );
  } catch (e) {
    const status = (e as {status?: number}).status;
    if (status === 404) {
      void vscode.window.showErrorMessage(
        "Debugger is not available for this job. Make sure the job is running with debugging enabled."
      );
    } else if (status === 403) {
      void vscode.window.showErrorMessage(
        "Permission denied. You may need to re-authenticate or check your access to this repository."
      );
    } else {
      const msg = (e as Error).message || "Unknown error";
      void vscode.window.showErrorMessage(`Failed to fetch debugger URL: ${msg}`);
    }
    return;
  }

  const validation = validateTunnelUrl(debuggerUrl);
  if (!validation.valid) {
    void vscode.window.showErrorMessage(`Invalid debugger URL returned by API: ${validation.reason}`);
    return;
  }

  // Store token in extension-private memory (not in the config) to avoid
  // exposing it to other extensions.
  const nonce = crypto.randomBytes(16).toString("hex");
  pendingTokens.set(nonce, token);

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

    // Consume immediately so it cannot be replayed.
    if (nonce) {
      pendingTokens.delete(nonce);
    }

    if (!tunnelUrl || !token) {
      throw new Error(
        "Missing tunnel URL or authentication token. Use the 'Connect to Actions Job Debugger' command to start a session."
      );
    }

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
