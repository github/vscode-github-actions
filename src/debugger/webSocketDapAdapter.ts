import * as vscode from "vscode";
import WebSocket from "ws";
import {log, logDebug, logError} from "../log";

/**
 * Interval between websocket ping frames, matching the proven keepalive
 * behaviour in gh-actions-debugger.
 */
const PING_INTERVAL_MS = 25_000;

const CONNECT_TIMEOUT_MS = 30_000;

/**
 * Inline debug adapter that speaks DAP over a websocket. DAP JSON payloads
 * are sent as individual text messages — no Content-Length framing. This
 * matches the runner's WebSocketDapBridge and the gh-actions-debugger CLI.
 */
export class WebSocketDapAdapter implements vscode.DebugAdapter {
  private readonly _onDidSendMessage = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
  readonly onDidSendMessage: vscode.Event<vscode.DebugProtocolMessage> = this._onDidSendMessage.event;

  private _ws: WebSocket | undefined;
  private _pingTimer: ReturnType<typeof setInterval> | undefined;
  private _replayTimer: ReturnType<typeof setTimeout> | undefined;
  private _terminatedFired = false;
  private _disposed = false;

  /**
   * Whether VS Code has completed the DAP initialization handshake. The
   * runner sends a `stopped` event immediately on connect (before the client
   * sends `configurationDone`), and VS Code ignores `stopped` events that
   * arrive before configuration is done. We buffer early `stopped` events
   * and replay them once the handshake completes.
   */
  private _configurationDone = false;
  private _pendingStoppedEvents: vscode.DebugProtocolMessage[] = [];

  constructor(
    private readonly _tunnelUrl: string,
    private readonly _token: string
  ) {}

  async connect(): Promise<void> {
    log(`Connecting to debugger tunnel: ${this._tunnelUrl}`);

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const ws = new WebSocket(this._tunnelUrl, {
        headers: {
          Authorization: `Bearer ${this._token}`
        }
      });

      const connectTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          ws.terminate();
          reject(new Error(`Connection timed out after ${CONNECT_TIMEOUT_MS / 1000}s`));
        }
      }, CONNECT_TIMEOUT_MS);

      const onOpen = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(connectTimer);
        cleanup();
        log("Connected to debugger tunnel");
        this._ws = ws;
        this._setupReceiver(ws);
        this._startPingLoop(ws);
        resolve();
      };

      const onError = (err: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(connectTimer);
        cleanup();
        logError(err, "Debugger tunnel connection error");
        reject(new Error(`Failed to connect to debugger tunnel: ${err.message}`));
      };

      const onClose = (code: number, reason: Buffer) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(connectTimer);
        cleanup();
        const reasonStr = reason.toString() || `code ${code}`;
        logError(new Error(reasonStr), "Debugger tunnel connection closed before open");
        reject(new Error(`Debugger tunnel connection closed: ${reasonStr}`));
      };

      const cleanup = () => {
        ws.removeListener("open", onOpen);
        ws.removeListener("error", onError);
        ws.removeListener("close", onClose);
      };

      ws.on("open", onOpen);
      ws.on("error", onError);
      ws.on("close", onClose);
    });
  }

  handleMessage(message: vscode.DebugProtocolMessage): void {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      logError(new Error("Cannot send — websocket not open"), "Debugger tunnel send failed");
      return;
    }

    const json = JSON.stringify(message);
    logDebug(`→ DAP: ${describeDapMessage(message)}`);

    try {
      this._ws.send(json);
    } catch (e) {
      logError(e as Error, "Debugger tunnel send threw");
      this._fireTerminated();
      this.dispose();
    }
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this._stopPingLoop();
    if (this._replayTimer) {
      clearTimeout(this._replayTimer);
      this._replayTimer = undefined;
    }
    if (this._ws) {
      try {
        this._ws.close(1000, "debug session ended");
      } catch {
        // ignore close errors during teardown
      }
      this._ws = undefined;
    }
    this._onDidSendMessage.dispose();
    log("Debugger tunnel connection closed");
  }

  private _setupReceiver(ws: WebSocket): void {
    ws.on("message", (data: WebSocket.Data) => {
      if (this._disposed) {
        return;
      }

      const text = typeof data === "string" ? data : data.toString();

      let message: vscode.DebugProtocolMessage;
      try {
        message = JSON.parse(text) as vscode.DebugProtocolMessage;
      } catch (e) {
        logError(e as Error, "Failed to parse DAP message from tunnel");
        return;
      }

      logDebug(`← DAP: ${describeDapMessage(message)}`);

      // Buffer stopped events that arrive before the configurationDone
      // response — the runner re-sends the stopped event on connect
      // (before the DAP handshake completes) and VS Code drops them.
      const m = message as Record<string, unknown>;
      if (m.type === "event" && m.event === "stopped" && !this._configurationDone) {
        logDebug("Buffering stopped event (configurationDone response not yet received)");
        this._pendingStoppedEvents.push(message);
        return;
      }

      // VS Code auto-focuses the top stack frame only if it has a source
      // reference. The runner doesn't set one yet (the ADR calls for adding
      // the workflow file later). Patch frames so VS Code auto-selects them.
      if (m.type === "response" && m.command === "stackTrace") {
        patchStackFrameSources(message);
      }

      this._onDidSendMessage.fire(message);

      // When the configurationDone response arrives from the runner,
      // replay any stopped events that were buffered during the
      // handshake. We use a short delay so VS Code finishes processing
      // the configurationDone response before receiving the event.
      if (m.type === "response" && m.command === "configurationDone") {
        this._configurationDone = true;
        if (this._pendingStoppedEvents.length > 0) {
          const events = this._pendingStoppedEvents;
          this._pendingStoppedEvents = [];
          logDebug(`Replaying ${events.length} buffered stopped event(s)`);
          this._replayTimer = setTimeout(() => {
            this._replayTimer = undefined;
            if (this._disposed) return;
            for (const evt of events) {
              this._onDidSendMessage.fire(evt);
            }
          }, 50);
        }
      }
    });

    ws.on("close", (code: number, reason: Buffer) => {
      if (this._disposed) {
        return;
      }
      const reasonStr = reason.toString() || `code ${code}`;
      log(`Debugger tunnel closed: ${reasonStr}`);
      this._stopPingLoop();
      this._fireTerminated();
      this.dispose();
    });

    ws.on("error", (err: Error) => {
      logError(err, "Debugger tunnel error");
    });
  }

  private _startPingLoop(ws: WebSocket): void {
    this._pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping("keepalive");
        } catch (e) {
          logError(e as Error, "Websocket ping failed");
          this._stopPingLoop();
          this._fireTerminated();
          this.dispose();
        }
      } else {
        this._stopPingLoop();
      }
    }, PING_INTERVAL_MS);
  }

  private _stopPingLoop(): void {
    if (this._pingTimer !== undefined) {
      clearInterval(this._pingTimer);
      this._pingTimer = undefined;
    }
  }

  private _fireTerminated(): void {
    if (this._terminatedFired) return;
    this._terminatedFired = true;
    this._onDidSendMessage.fire({
      type: "event",
      event: "terminated",
      seq: 0
    } as unknown as vscode.DebugProtocolMessage);
  }
}

function describeDapMessage(msg: vscode.DebugProtocolMessage): string {
  const m = msg as Record<string, unknown>;
  const type = (m.type as string) ?? "unknown";
  const detail = (m.command as string) ?? (m.event as string) ?? "";
  return detail ? `${type}:${detail}` : type;
}

interface DapStackFrame {
  id: number;
  name: string;
  source?: {name?: string; path?: string; sourceReference?: number; presentationHint?: string};
  line: number;
  column: number;
  presentationHint?: string;
}

/**
 * VS Code auto-focuses the top stack frame after a `stopped` event only when
 * that frame carries a `source` reference. The runner doesn't set one yet (the
 * ADR plans to add the workflow file as source later). Until then, we inject a
 * minimal synthetic source so VS Code's auto-focus works.
 */
function patchStackFrameSources(message: vscode.DebugProtocolMessage): void {
  const m = message as Record<string, unknown>;
  const body = m.body as {stackFrames?: DapStackFrame[]} | undefined;
  if (!body?.stackFrames) {
    return;
  }

  for (const frame of body.stackFrames) {
    if (!frame.source) {
      frame.source = {
        name: frame.name,
        // A positive sourceReference tells VS Code to use the DAP `source`
        // request to fetch content. We reuse the frame id; the runner will
        // respond (or fail gracefully) when VS Code asks for it.
        sourceReference: frame.id,
        presentationHint: "deemphasize"
      };
    }
  }
}
