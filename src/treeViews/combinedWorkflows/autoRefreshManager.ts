import * as vscode from "vscode";
import {logDebug} from "../../log";

interface AutoRefreshConfig {
  enabled: boolean;
  interval: number;
  duration: number;
  onPushOnly: boolean;
}

export class AutoRefreshManager {
  private config: AutoRefreshConfig;
  private timer?: NodeJS.Timeout;
  private descriptionTimer?: NodeJS.Timeout;
  private endTime?: number;
  private isVisible = false;
  private lastActualRefreshTime?: number;
  private readonly refreshCallback: () => Promise<void>;
  private readonly updateDescriptionCallback: (description: string) => void;

  constructor(refreshCallback: () => Promise<void>, updateDescriptionCallback: (description: string) => void) {
    this.refreshCallback = refreshCallback;
    this.updateDescriptionCallback = updateDescriptionCallback;
    this.config = this.loadConfig();

    if (this.config.enabled && !this.config.onPushOnly) {
      this.start();
    }

    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration("github-actions.combined-workflows.auto-refresh")) {
        this.config = this.loadConfig();
        this.updateDescription();
        if (this.config.enabled && !this.config.onPushOnly) {
          this.start();
        } else {
          this.stop();
        }
      }
    });
  }

  private loadConfig(): AutoRefreshConfig {
    const config = vscode.workspace.getConfiguration("github-actions.combined-workflows.auto-refresh");
    return {
      enabled: config.get<boolean>("enabled", false),
      interval: config.get<number>("interval", 60),
      duration: config.get<number>("duration", 15),
      onPushOnly: config.get<boolean>("on-push-only", true)
    };
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.updateDescription();
  }

  onPush(): void {
    if (!this.config.enabled) {
      logDebug("Auto-refresh: onPush called but disabled");
      return;
    }

    logDebug("Auto-refresh: onPush called, starting auto-refresh");
    this.start();
  }

  start(): void {
    if (!this.config.enabled) {
      logDebug("Auto-refresh: start called but disabled");
      return;
    }

    logDebug(`Auto-refresh: starting (interval=${this.config.interval}s, duration=${this.config.duration}m, visible=${this.isVisible})`);

    this.endTime = Date.now() + this.config.duration * 60 * 1000;

    if (!this.lastActualRefreshTime) {
      this.lastActualRefreshTime = Date.now();
    }

    this.updateDescription();

    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.descriptionTimer) {
      clearInterval(this.descriptionTimer);
    }

    this.timer = setInterval(() => {
      if (!this.endTime || Date.now() >= this.endTime) {
        logDebug("Auto-refresh: stopping (time expired)");
        this.stop();
        return;
      }

      if (this.isVisible) {
        logDebug("Auto-refresh: triggering refresh");
        this.lastActualRefreshTime = Date.now();
        void this.refreshCallback();
      } else {
        logDebug("Auto-refresh: skipping (view not visible)");
      }
    }, this.config.interval * 1000);

    this.descriptionTimer = setInterval(() => {
      this.updateDescription();
    }, 1000);

    this.updateDescription();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    if (this.descriptionTimer) {
      clearInterval(this.descriptionTimer);
      this.descriptionTimer = undefined;
    }
    this.endTime = undefined;
    this.updateDescription();
  }

  dispose(): void {
    this.stop();
  }

  isActive(): boolean {
    return this.timer !== undefined;
  }

  getDescription(): string {
    if (!this.config.enabled) {
      return "Disabled";
    }

    if (!this.timer || !this.endTime) {
      return "Waiting for push";
    }

    const now = Date.now();
    const timeLeft = Math.floor((this.endTime - now) / 60000);
    const secondsSinceRefresh = this.lastActualRefreshTime ? Math.floor((now - this.lastActualRefreshTime) / 1000) : 0;

    return `${secondsSinceRefresh}s ago, ${Math.max(0, timeLeft)}m left`;
  }

  private updateDescription(): void {
    this.updateDescriptionCallback(this.getDescription());
  }

  toggleAutoRefresh(): void {
    if (this.isActive()) {
      this.stop();
    } else {
      this.start();
    }
  }
}
