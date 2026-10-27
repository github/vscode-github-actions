import {beforeEach, describe, expect, it, jest} from "@jest/globals";

const getSession = jest.fn<() => Promise<unknown>>();
const request = jest.fn<() => Promise<unknown>>();

jest.unstable_mockModule("../auth/auth", () => ({getSession}));
jest.unstable_mockModule("../log", () => ({logError: jest.fn()}));
jest.unstable_mockModule("./api", () => ({getClient: () => ({request})}));

const {getGitHubAPIStatus, resetGitHubAPIStatus} = await import("./canReachGitHubAPI");

describe("getGitHubAPIStatus", () => {
  beforeEach(() => {
    resetGitHubAPIStatus();
    getSession.mockReset().mockResolvedValue({accessToken: "token"});
    request.mockReset();
  });

  it("returns signed-out without a session", async () => {
    getSession.mockResolvedValue(undefined);

    expect(await getGitHubAPIStatus()).toBe("signed-out");
    expect(request).not.toHaveBeenCalled();
  });

  it("returns ok when the API accepts the token", async () => {
    request.mockResolvedValue({status: 200});

    expect(await getGitHubAPIStatus()).toBe("ok");
  });

  it("returns unauthorized when the API rejects the token", async () => {
    request.mockRejectedValue(Object.assign(new Error("Bad credentials"), {status: 401}));

    expect(await getGitHubAPIStatus()).toBe("unauthorized");
  });

  it("returns unreachable for other failures", async () => {
    request.mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.github.com"));

    expect(await getGitHubAPIStatus()).toBe("unreachable");
  });

  it("caches the status until it is reset", async () => {
    request.mockRejectedValue(Object.assign(new Error("Bad credentials"), {status: 401}));
    expect(await getGitHubAPIStatus()).toBe("unauthorized");

    request.mockResolvedValue({status: 200});
    expect(await getGitHubAPIStatus()).toBe("unauthorized");

    resetGitHubAPIStatus();
    expect(await getGitHubAPIStatus()).toBe("ok");
  });
});
