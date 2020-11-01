# Change Log

All notable changes to the "vscode-github-actions" extension will be documented in this file.

## [v0.9.0]
- Updated `github-actions-parser` dependency to fix a number of auto-complete and validation bugs
- Removed edit preview features, they are now enabled by default
- Changed the scope of the org features setting, so that it can be set for remote workspaces, too

## [v0.8.1]
- Fixes expression auto-completion in YAML multi-line strings

## [v0.8.0] The one with the auto-completion
- Enable the `github-actions.preview-features` setting to start using smart auto-complete and validation.

## [v0.7.0]
- Support the VS Code authentication API with the VS Code July release (1.48). This replaces the previous, manual PAT-based authentication flow.

  Note: Organization features like displaying Organization-level Secrets require the `admin:org` scope. Since not everyone might want to give this scope to the VS Code token, by default this scope is not requested. There is a new setting to request the scope.

- Moved all commands into a `github-actions.` namespace and "GitHub Actions" category in the command palette

## [v0.6.0]
- Update success icon
- Support org secrets

## [v0.5.1]
- Roll back VS Code authentication API change for now. Wait until it becomes stable to remove need for manual enabling.

## [v0.5.0]
- Support the VS Code authentication API. This replaces the previous, manual PAT-based authentication flow.

## [v0.4.1]
- Add inline run button to workflow list

## [v0.4.0]
- Bugfixes for remote development
- Show run button for workflows using `repository_dispatch` in editor title bar

## [v0.3.0]
- Enable pinning workflows

## [v0.2.0]
- Bugfix for displaying self-hosted runners

## [v0.1.16]
- Bugfix: "Trigger workflow" shows up for workflows using the object notation to define the `on` events
- Feature: If `repository_dispatch` is filtered to specific types, the trigger workflow run will be pre-populated with those.

## [v0.1.15]
- Support colored logs

## [v0.1.14]
- Support displaying logs for workflows

## [v0.1.1]
- Initial prototype
