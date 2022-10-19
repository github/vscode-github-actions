### Development in Codespaces

This Codespaces/devcontainer setup uses [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces) to allow us to test changes to multiple packages.

npm workspaces are really meant for mono-repos, but we can use that feature here to link our various packages together so you can make changes to a package and immediately consume those changes in a dependent package.

### Make changes

1. Open the workspace in VS Code `File -> Open Workspace from File...`: `/workspaces/vscode-github-actions.code-workspace`
1. Make change to any of the packages
1. Build them all with `npm run build -ws` in `/workspaces/`
1. Start and debug extension

#### Updating dependencies


Once you're happy with your changes, publish the changes to the respective packages. You might have to adjust package versions, so if you made a change to `actions-workflow-parser` and increase the version there, you will have to consume the updated package in `actions-languageservice`.

`npm workspaces` hoists all dependencies into a shared `node_modules` folder at the root directory (`/workspaces/node_modules`) and also creates a single `package-lock.json` file there for the whole workspace. We don't want that when pushing changes back to the individual repos.

There is a script in `/workspaces`: `update-package-locks.sh` that does an `npm install` in every package directory _withou_ using workspaces. That way, the local `package-lock.json` file is generated correctly and can be pushed to the repository.

### Debugging

Launching and debugging the extension should just work. If you need to debug the language server, start the extension first, then execute the `Attach to language-server` target to also attach to the language server.