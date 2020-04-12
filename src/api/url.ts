import { URL } from "url";

export function workflowsUrl(repository: string): string {
  const url = new URL(`${repository}/actions/workflows`);
  url.host = "api.github.com";
  return url.toString();
}
