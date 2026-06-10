import * as vscode from "vscode";
import {deactivateLanguageServer, initLanguageServer} from "../workflow/languageServer";
import {resetGitHubContext} from "../git/repository";

const settingsKey = "github-actions";
const DEFAULT_GITHUB_API = "https://api.github.com";
const reloadWindowAction = "Reload Window";
const debuggerEnabledSettingsKey = getSettingsKey("debugger.enabled");

let debuggerSettingReloadPromptVisible = false;

export function initConfiguration(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async e => {
      if (e.affectsConfiguration(getSettingsKey("workflows.pinned"))) {
        pinnedWorkflowsChangeHandlers.forEach(h => h());
      }

      if (
        e.affectsConfiguration(getSettingsKey("use-enterprise")) ||
        (useEnterprise() &&
          (e.affectsConfiguration("github-enterprise.uri") || e.affectsConfiguration(getSettingsKey("remote-name"))))
      ) {
        await updateLanguageServerApiUrl(context);
        resetGitHubContext();
        await vscode.commands.executeCommand("github-actions.explorer.refresh");
      }

      if (e.affectsConfiguration(debuggerEnabledSettingsKey)) {
        await promptToReloadForDebuggerSettingChange(context);
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

export function isDebuggerEnabled(): boolean {
  return getConfiguration().get<boolean>(debuggerEnabledSettingsKey, false);
}

export function useEnterprise(): boolean {
  return getConfiguration().get<boolean>(getSettingsKey("use-enterprise"), false);
}

export function getGitHubApiUri(): string {
  if (!useEnterprise()) return DEFAULT_GITHUB_API;
  const base = getConfiguration().get<string>("github-enterprise.uri", DEFAULT_GITHUB_API).replace(/\/$/, "");
  if (base === DEFAULT_GITHUB_API) {
    return base;
  }

  if (base.endsWith(".ghe.com")) {
    return base.replace(/^(https?):\/\//, "$1://api.");
  } else {
    return `${base}/api/v3`;
  }
}

async function updateLanguageServerApiUrl(context: vscode.ExtensionContext) {
  await deactivateLanguageServer();

  await initLanguageServer(context);
}

async function promptToReloadForDebuggerSettingChange(context: vscode.ExtensionContext) {
  if (vscode.env.uiKind !== vscode.UIKind.Desktop) {
    return;
  }

  if (debuggerSettingReloadPromptVisible) {
    return;
  }

  debuggerSettingReloadPromptVisible = true;

  try {
    if (context.extensionMode !== vscode.ExtensionMode.Production) {
      await vscode.window.showInformationMessage(
        "Reload VS Code manually to apply the GitHub Actions debugger preview setting change. Automatic reload is disabled in the Extension Development Host."
      );
      return;
    }

    const selection = await vscode.window.showInformationMessage(
      "Reload VS Code to apply the GitHub Actions debugger preview setting change.",
      reloadWindowAction
    );

    if (selection === reloadWindowAction) {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  } finally {
    debuggerSettingReloadPromptVisible = false;
  }
}
