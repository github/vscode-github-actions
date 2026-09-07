import {getWorkflowRunContextValue} from "./workflowRunContext";

describe("getWorkflowRunContextValue", () => {
  it.each([
    ["read", "completed", "run completed"],
    ["write", "queued", "run cancelable"],
    ["write", "completed", "run rerunnable deletable completed"],
    ["admin", "completed", "run rerunnable deletable completed"]
  ] as const)("returns the available actions for %s access to a %s run", (permission, status, expected) => {
    expect(getWorkflowRunContextValue(status, permission)).toBe(expected);
  });
});
