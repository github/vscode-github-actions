import {DocumentFilter} from "vscode-languageclient";

// Only documents backed by the workspace: local files, github.dev's virtual
// file system and the folder mounted by `npm run open-in-browser`. Read-only
// copies such as the `git:` documents behind diff editors would otherwise be
// validated too, and without a workspace they report false errors, e.g. for
// local reusable workflows.
const schemes = ["file", "vscode-vfs", "vscode-test-web"];

export const WorkflowSelector: DocumentFilter[] = schemes.map(scheme => ({
  scheme,
  pattern: "**/.github/workflows/*.{yaml,yml}"
}));

export const ActionSelector: DocumentFilter[] = schemes.map(scheme => ({
  scheme,
  pattern: "**/action.{yml,yaml}"
}));
