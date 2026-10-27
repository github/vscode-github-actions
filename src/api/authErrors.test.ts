import {describe, expect, it, jest} from "@jest/globals";
import {isUnauthorizedError, notifyUnauthorized, onUnauthorized} from "./authErrors";

describe("isUnauthorizedError", () => {
  it("detects a 401 response", () => {
    expect(isUnauthorizedError(Object.assign(new Error("Bad credentials"), {status: 401}))).toBe(true);
  });

  it("ignores other response statuses", () => {
    expect(isUnauthorizedError(Object.assign(new Error("Forbidden"), {status: 403}))).toBe(false);
    expect(isUnauthorizedError(Object.assign(new Error("Server error"), {status: 500}))).toBe(false);
  });

  it("ignores errors without a status", () => {
    expect(isUnauthorizedError(new Error("getaddrinfo ENOTFOUND api.github.com"))).toBe(false);
    expect(isUnauthorizedError(undefined)).toBe(false);
    expect(isUnauthorizedError("401")).toBe(false);
  });
});

describe("onUnauthorized", () => {
  it("notifies listeners until they are disposed", () => {
    const listener = jest.fn();
    const subscription = onUnauthorized(listener);

    notifyUnauthorized();
    expect(listener).toHaveBeenCalledTimes(1);

    subscription.dispose();
    notifyUnauthorized();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
