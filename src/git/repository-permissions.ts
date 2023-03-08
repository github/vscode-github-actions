export type RepositoryPermission = "admin" | "write" | "read";

// https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#get-a-repository
// This should always be set for authenticated requests
type RepositoryPermissionResponse = {
  admin: boolean;
  maintain?: boolean;
  push: boolean;
  triage?: boolean;
  pull: boolean;
};

export function getRepositoryPermission(permissions: RepositoryPermissionResponse | undefined): RepositoryPermission {
  return permissions?.admin ? "admin" : permissions?.push ? "write" : "read";
}

export function hasAdminPermission(permission: RepositoryPermission): boolean {
  return permission === "admin";
}

export function hasWritePermission(permission: RepositoryPermission): boolean {
  return permission === "admin" || permission === "write";
}
