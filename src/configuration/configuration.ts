import * as vscode from "vscode";
import {deactivateLanguageServer, initLanguageServer} from "../workflow/languageServer";

const settingsKey = "github-actions";
const DEFAULT_GITHUB_API = "https://api.github.com";

export function initConfiguration(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(getSettingsKey("workflows.pinned"))) {
        pinnedWorkflowsChangeHandlers.forEach(h => h());
      } else if (
        e.affectsConfiguration(getSettingsKey("use-enterprise")) ||
        e.affectsConfiguration("github-enterprise.uri")
      ) {
        updateLanguageServerApiUrl(context);
      }
    })
  );
}

function getConfiguration() {
  return vscode.workspace.getConfiguration();
}

function getSettingsKey(settingsPath: string): string {
  return `${settingsKey}.${settingsPath}`;
}

const pinnedWorkflowsChangeHandlers: (() => void)[] = [];
export function onPinnedWorkflowsChange(handler: () => void) {
  pinnedWorkflowsChangeHandlers.push(handler);
}

export function getPinnedWorkflows(): string[] {
  return getConfiguration().get<string[]>(getSettingsKey("workflows.pinned.workflows"), []);
}

export async function pinWorkflow(workflow: string) {
  const pinedWorkflows = Array.from(new Set(getPinnedWorkflows()).add(workflow));
  await getConfiguration().update(getSettingsKey("workflows.pinned.workflows"), pinedWorkflows);
}

export async function unpinWorkflow(workflow: string) {
  const x = new Set(getPinnedWorkflows());
  x.delete(workflow);
  const pinnedWorkflows = Array.from(x);
  await getConfiguration().update(getSettingsKey("workflows.pinned.workflows"), pinnedWorkflows);
}

export function isPinnedWorkflowsRefreshEnabled(): boolean {
  return getConfiguration().get<boolean>(getSettingsKey("workflows.pinned.refresh.enabled"), false);
}

export function pinnedWorkflowsRefreshInterval(): number {
  return getConfiguration().get<number>(getSettingsKey("workflows.pinned.refresh.interval"), 60);
}

export function getRemoteName(): string {
  return getConfiguration().get<string>(getSettingsKey("remote-name"), "origin");
}

export function isUseEnterprise(): boolean {
  return getConfiguration().get<boolean>(getSettingsKey("use-enterprise"), false);
}

export function getGitHubApiUri(): string {
  if (!isUseEnterprise()) return DEFAULT_GITHUB_API;
  const base = getConfiguration().get<string>("github-enterprise.uri", DEFAULT_GITHUB_API).replace(/\/$/, "");
  return base === DEFAULT_GITHUB_API ? base : `${base}/api/v3`;
}

function updateLanguageServerApiUrl(context: vscode.ExtensionContext) {
  deactivateLanguageServer();

  initLanguageServer(context);
}
