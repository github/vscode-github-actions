import {beforeEach, describe, expect, it, jest} from "@jest/globals";

type Handler = () => Promise<void>;

const handlers = new Map<string, Handler>();
const getSession = jest.fn<(createIfNone?: boolean) => Promise<unknown>>();
const newSession = jest.fn<(message: string) => Promise<unknown>>();
const getGitHubAPIStatus = jest.fn<() => Promise<string>>();
const resetGitHubAPIStatus = jest.fn();
const resetGitHubContext = jest.fn();
const updateContextKeys = jest.fn<() => Promise<unknown>>();

jest.unstable_mockModule("vscode", () => ({
  commands: {
    registerCommand: (id: string, handler: Handler) => {
      handlers.set(id, handler);
      return {dispose: jest.fn()};
    }
  }
}));
jest.unstable_mockModule("../auth/auth", () => ({getSession, newSession}));
jest.unstable_mockModule("../auth/authState", () => ({updateContextKeys}));
jest.unstable_mockModule("../api/canReachGitHubAPI", () => ({getGitHubAPIStatus, resetGitHubAPIStatus}));
jest.unstable_mockModule("../git/repository", () => ({resetGitHubContext}));
jest.unstable_mockModule("../log", () => ({logError: jest.fn()}));

const {registerSignIn} = await import("./signIn");

async function signIn() {
  registerSignIn({subscriptions: []} as never);
  await handlers.get("github-actions.sign-in")?.();
}

describe("github-actions.sign-in", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSession.mockResolvedValue({accessToken: "token"});
    newSession.mockResolvedValue({accessToken: "new-token"});
    updateContextKeys.mockResolvedValue({status: "ok", hasGitHubRepos: true});
  });

  it("keeps a session the API accepts", async () => {
    getGitHubAPIStatus.mockResolvedValue("ok");

    await signIn();

    expect(getSession).toHaveBeenCalledWith(true);
    expect(newSession).not.toHaveBeenCalled();
    expect(updateContextKeys).toHaveBeenCalled();
  });

  it("forces a new session when the API rejects the token", async () => {
    getGitHubAPIStatus.mockResolvedValue("unauthorized");

    await signIn();

    expect(newSession).toHaveBeenCalled();
    expect(resetGitHubAPIStatus).toHaveBeenCalled();
    expect(resetGitHubContext).toHaveBeenCalled();
    expect(updateContextKeys).toHaveBeenCalled();
  });

  it("does not force a new session when the API is unreachable", async () => {
    getGitHubAPIStatus.mockResolvedValue("unreachable");

    await signIn();

    expect(newSession).not.toHaveBeenCalled();
    expect(updateContextKeys).toHaveBeenCalled();
  });

  it("stops when the user cancels signing in again", async () => {
    getGitHubAPIStatus.mockResolvedValue("unauthorized");
    newSession.mockRejectedValue(new Error("Cancelled"));

    await signIn();

    expect(resetGitHubAPIStatus).not.toHaveBeenCalled();
    expect(updateContextKeys).not.toHaveBeenCalled();
  });

  it("does nothing without a session", async () => {
    getSession.mockResolvedValue(undefined);

    await signIn();

    expect(getGitHubAPIStatus).not.toHaveBeenCalled();
    expect(updateContextKeys).not.toHaveBeenCalled();
  });
});
