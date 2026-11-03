import {jest} from "@jest/globals";
import {Octokit} from "@octokit/rest";
import {setImmediate as nextTurn} from "node:timers";
import type * as vscode from "vscode";
import type {GitHubRepoContext} from "../git/repository";
import type {WorkflowRun as RunData} from "../model";
import type {WorkflowRunNode} from "../treeViews/shared/workflowRunNode";

class TestUri {
  constructor(public fsPath: string) {}

  static file(path: string) {
    return new TestUri(path);
  }
}

const executeCommand = jest.fn<(command: string) => Promise<void>>();
const registerCommand =
  jest.fn<(command: string, callback: (uri: vscode.Uri) => Promise<unknown>) => vscode.Disposable>();
const showInputBox = jest.fn<() => Promise<string | undefined>>();
const log = jest.fn();
let repoContext: GitHubRepoContext;

// Jest 29.0's ESM resolver also needs the virtual module registered in its CommonJS map.
jest.mock("vscode", () => ({}), {virtual: true});
jest.unstable_mockModule(
  "vscode",
  () => ({
    Uri: TestUri,
    EventEmitter: class {
      event = jest.fn<(listener: unknown) => void>();
      fire = jest.fn<(event: unknown) => void>();
    },
    commands: {executeCommand, registerCommand},
    workspace: {
      getWorkspaceFolder: () => ({uri: TestUri.file("/repo")}),
      asRelativePath: () => ".github/workflows/build.yml"
    },
    window: {
      showInputBox,
      setStatusBarMessage: jest.fn(),
      withProgress: async (_options: unknown, task: () => Promise<unknown>) => task()
    },
    ProgressLocation: {Window: 10}
  }),
  {virtual: true}
);
jest.unstable_mockModule("../log", () => ({log, logDebug: jest.fn()}));
jest.unstable_mockModule("timers", () => ({
  setInterval: (callback: () => void, intervalMs: number) => setInterval(callback, intervalMs)
}));
jest.unstable_mockModule("../git/repository", () => ({
  getGitHead: () => Promise.resolve("refs/heads/main"),
  getGitHubContextForWorkspaceUri: () => Promise.resolve(repoContext)
}));
jest.unstable_mockModule("../workflow/workflow", () => ({
  parseWorkflowFile: () => Promise.resolve({events: {workflow_dispatch: {}}}),
  getWorkflowUri: () => TestUri.file("/repo/.github/workflows/build.yml")
}));
jest.unstable_mockModule("./workflowRun", () => ({
  WorkflowRun: class {
    constructor(_context: GitHubRepoContext, public run: RunData) {}

    updateRun(run: RunData) {
      this.run = run;
    }
  }
}));
jest.unstable_mockModule("../treeViews/shared/workflowRunNode", () => ({
  WorkflowRunNode: class {
    updateRun = jest.fn();
  }
}));

const {RunStore} = await import("./store");
const {WorkflowRunTreeDataProvider} = await import("../treeViews/workflowRunTreeDataProvider");
const {registerTriggerWorkflowRun} = await import("../commands/triggerWorkflowRun");
const {Uri} = await import("vscode");

class TestProvider extends WorkflowRunTreeDataProvider {
  refresh(run: RunData) {
    return this.runNodes(repoContext, [run]);
  }

  protected _updateNode = jest.fn<(node: WorkflowRunNode) => void>();
}

const runData = {id: 42, status: "in_progress", updated_at: "2025-01-01T00:00:00Z"} as RunData;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  repoContext = {
    client: new Octokit(),
    repositoryState: undefined,
    workspaceUri: Uri.file("/repo"),
    id: 1,
    owner: "owner",
    name: "repo",
    organizationOwned: false,
    defaultBranch: "main",
    permissionLevel: "write"
  };
  executeCommand.mockResolvedValue(undefined);
  showInputBox.mockResolvedValue("main");
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

function mockRunFetch(run: RunData = runData) {
  return jest.spyOn(repoContext.client.actions, "getWorkflowRun").mockResolvedValue({
    data: run,
    status: 200,
    headers: {},
    url: "https://api.github.com/repos/owner/repo/actions/runs/42"
  });
}

async function advanceTime(ms: number) {
  await new Promise<void>(resolve => nextTurn(resolve));
  for (let elapsed = 0; elapsed < ms; elapsed += 1000) {
    jest.advanceTimersByTime(Math.min(1000, ms - elapsed));
    await new Promise<void>(resolve => nextTurn(resolve));
  }
}

describe("active run polling", () => {
  it("preserves the timer deadline when tree nodes refresh", async () => {
    const fetch = mockRunFetch();
    const provider = new TestProvider(new RunStore());
    provider.refresh(runData);
    await advanceTime(3000);
    provider.refresh(runData);
    await advanceTime(1000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);
  });

  it("does not replenish the 225-attempt budget on tree refresh", async () => {
    const fetch = mockRunFetch();
    const provider = new TestProvider(new RunStore());
    provider.refresh(runData);
    await advanceTime(4000);
    provider.refresh(runData);
    await advanceTime(4000 * 224);
    expect(fetch).toHaveBeenCalledTimes(225);
    expect(jest.getTimerCount()).toBe(0);
    await advanceTime(4000);
    expect(fetch).toHaveBeenCalledTimes(225);
  });

  it("preserves explicit restart behavior for rerun and cancel commands", async () => {
    const fetch = mockRunFetch();
    const store = new RunStore();
    const provider = new TestProvider(store);
    provider.refresh(runData);
    await advanceTime(3000);
    store.pollRun(runData.id, repoContext, 1000, 2);
    provider.refresh(runData);
    await advanceTime(2000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(["focus", "visibility"])("pauses without consuming attempts when %s is lost", async state => {
    const fetch = mockRunFetch();
    const store = new RunStore();
    const setActive = (active: boolean) => {
      if (state === "focus") store.setFocused(active);
      else store.setViewVisible(active);
    };
    store.pollRun(runData.id, repoContext, 1000, 2);
    setActive(false);
    await advanceTime(10000);
    expect(fetch).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
    setActive(true);
    await advanceTime(2000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("stops polling when the run completes", async () => {
    const fetch = mockRunFetch({...runData, status: "completed"});
    new TestProvider(new RunStore()).refresh(runData);
    await advanceTime(8000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("triggered workflow refresh", () => {
  function setupTrigger() {
    const listRuns = jest.spyOn(repoContext.client.actions, "listWorkflowRuns").mockResolvedValue({
      data: {total_count: 1, workflow_runs: [runData]},
      status: 200,
      headers: {},
      url: "https://api.github.com/repos/owner/repo/actions/workflows/build.yml/runs"
    });
    const dispatch = jest.spyOn(repoContext.client.actions, "createWorkflowDispatch").mockResolvedValue({
      data: undefined as never,
      status: 204,
      headers: {},
      url: "https://api.github.com/repos/owner/repo/actions/workflows/build.yml/dispatches"
    });
    const store = new RunStore();
    const poll = jest.spyOn(store, "pollRun").mockImplementation(() => undefined);
    registerCommand.mockReturnValue({dispose: () => undefined});
    const context: Partial<vscode.ExtensionContext> = {subscriptions: []};
    registerTriggerWorkflowRun(context as vscode.ExtensionContext, store);
    const callback = registerCommand.mock.calls[0][1];
    return {listRuns, dispatch, poll, invoke: () => callback(Uri.file("/repo/.github/workflows/build.yml"))};
  }

  it("refreshes once and polls immediately when a new run is detected", async () => {
    const {listRuns, poll, invoke} = setupTrigger();
    listRuns.mockResolvedValueOnce({
      data: {total_count: 0, workflow_runs: []},
      status: 200,
      headers: {},
      url: "https://api.github.com/repos/owner/repo/actions/workflows/build.yml/runs"
    });
    await invoke();
    expect(listRuns).toHaveBeenCalledTimes(2);
    expect(executeCommand).toHaveBeenCalledTimes(1);
    expect(executeCommand).toHaveBeenCalledWith("github-actions.explorer.refresh");
    expect(poll).toHaveBeenCalledWith(runData.id, repoContext, 4000, 225);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("keeps the fallback refresh when discovery times out", async () => {
    const {listRuns, poll, invoke} = setupTrigger();
    const pending = invoke();
    await advanceTime(19000);
    await pending;
    expect(listRuns).toHaveBeenCalledTimes(21);
    expect(executeCommand).toHaveBeenCalledTimes(1);
    expect(poll).not.toHaveBeenCalled();
  });

  it("keeps the fallback refresh when discovery requests fail", async () => {
    const {listRuns, poll, invoke} = setupTrigger();
    listRuns.mockRejectedValue(new Error("API unavailable"));
    const pending = invoke();
    await advanceTime(19000);
    await pending;
    expect(log).toHaveBeenCalledWith("Error checking for new run: API unavailable");
    expect(executeCommand).toHaveBeenCalledTimes(1);
    expect(poll).not.toHaveBeenCalled();
  });

  it("does not poll when dispatch is cancelled", async () => {
    const {dispatch, poll, invoke} = setupTrigger();
    showInputBox.mockResolvedValue(undefined);
    await invoke();
    expect(dispatch).not.toHaveBeenCalled();
    expect(poll).not.toHaveBeenCalled();
    expect(executeCommand).toHaveBeenCalledTimes(1);
  });
});
