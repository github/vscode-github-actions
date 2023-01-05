# Development

## Workspaces

It's recommended to use [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces) to allow testing changes to multiple packages. On Codespaces, this is already set up.

npm workspaces are really meant for mono-repos, but we can use that feature here to link our various packages together so you can make changes to a package and immediately consume those changes in a dependent package.

## Local Setup

The workspace files will be in the parent directory of the repository, so it's recommended to create a folder for all of the workspace repositories.

```shell
mkdir ~/vscode
cd ~/vscode
```

Then, clone this repository and run `script/bootstrap` to pull in the other repositories.

```shell
gh repo clone github/vscode-github-actions
cd vscode-github-actions
script/bootstrap
```

For any private NPM packages in `@github`, you'll need to login with NPM. See [Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) for more details.

```shell
npm login --scope=@github --registry=https://npm.pkg.github.com
```

Finally, install packages in the workspace and build

```shell
cd ~/parser
npm i
npm run build -ws
```

## Make changes

1. Open the workspace in VS Code `File -> Open Workspace from File...`: `/workspaces/vscode-github-actions.code-workspace`
    - If you're doing local development, replace `workspaces` with the folder you created above (`vscode` in the example)
1. Make change to any of the packages
1. Build them all with `npm run build -ws` in `/workspaces/` or your local dev folder
1. Uninstall or disable the Actions extension in your development instance of VS Code
1. Start and debug extension with the `Watch & Launch Extension` configuration from the "Run and Debug" side panel menu
1. Open a workspace in the remote extension host that contains workflow files in the `.github/workflows` directory

### Updating dependencies

Once you're happy with your changes, publish the changes to the respective packages. You might have to adjust package versions, so if you made a change to `actions-workflow-parser` and increase the version there, you will have to consume the updated package in `actions-languageservice`.

`npm workspaces` hoists all dependencies into a shared `node_modules` folder at the root directory (`/workspaces/node_modules` or your local dev folder) and also creates a single `package-lock.json` file there for the whole workspace. We don't want that when pushing changes back to the individual repos.

There is a script in `/workspaces` (or your local dev folder): `update-package-locks.sh` that does an `npm install` in every package directory _without_ using workspaces. That way, the local `package-lock.json` file is generated correctly and can be pushed to the repository.

## Debugging

Launching and debugging the extension should just work. If you need to debug the language server, start the extension first, then execute the `Attach to language-server` target to also attach to the language server.
