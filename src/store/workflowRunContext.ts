import {RepositoryPermission, hasWritePermission} from "../git/repository-permissions";

export function getWorkflowRunContextValue(status: string | null, permission: RepositoryPermission): string {
  const contextValues = ["run"];
  const completed = status === "completed";

  if (hasWritePermission(permission)) {
    contextValues.push(completed ? "rerunnable" : "cancelable");
    if (completed) {
      contextValues.push("deletable");
    }
  }

  if (completed) {
    contextValues.push("completed");
  }

  return contextValues.join(" ");
}
