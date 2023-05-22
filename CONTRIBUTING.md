## Contributing

[fork]: https://github.com/github/vscode-github-actions/fork
[pr]: https://github.com/github/vscode-github-actions/compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

We accept pull requests for bug fixes and features where we've discussed the approach in an issue and given the go-ahead for a community member to work on it. We'd also love to hear about ideas for new features as issues.

We track issues on our project board [here](https://github.com/orgs/github/projects/9557/views/1).

Please do:

* Check existing issues to verify that the [bug][bug issues] or [feature request][feature request issues] has not already been submitted.
* Open an issue if things aren't working as expected.
* Open an issue to propose a significant change.
* Open a pull request to fix a bug.
* Open a pull request to fix documentation about a command.
* Open a pull request for any issue labelled [`help wanted`][hw] or [`good first issue`][gfi].

Please avoid:

* Opening pull requests for issues marked `needs-design`, `needs-investigation`, or `blocked`.

Contributions to this project are [released](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license) to the public under the [project's open source license](LICENSE).

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Prerequisites for running and testing code

These are one time installations required to be able to test your changes locally as part of the pull request (PR) submission process.

1. Install [Node.js](https://nodejs.org/en/download/) for your platform
1. Install [VS Code](https://code.visualstudio.com/download) for your platform
1. Install the dependencies. From the repository root (`~/vscode`) run:

```bash
npm i
```

### Dev loop & Testing changes

The extension is written in TypeScript and built using [webpack](https://webpack.js.org/).

1. Go to the Debug tab.
    1. Hit `Watch all & Launch Extension (workspace)` if you want to work on the main VS Code extension like the left sidebar and the UI for the extension.
    1. Hit `Watch & Launch Extension + language-server (workspace)` If you want to work on the language services code and want to debug and work on the hover, syntax highlighting, and other functionality within the Workflow files.
        * This will attach to an instance of the language server running on port `6010`
1. Hit the green button (this will automatically run `npm watch` for you and monitor for changes) which will open a local version of the extension using the _extension development host_.
1. Make changes
1. Hit the refresh button in the debugger window to reload the extension in the development host

## npm commands

For the below make sure that you are in the `vscode-github-actions` directory of your local repo first.

```bash
cd vscode-github-actions
```

### Build

Build changes (one time):

```bash
npm run build
```

Or to watch for changes and automatically rebuild every time on save:

```bash
npm run watch
```

### Running tests

_Note: We added `cross-env` to our package.json so that this works on both Mac and Windows._

```bash
npm test
```

Or to watch for changes and run tests:

```bash
npm run test-watch
```

### Lint

```bash
npm run lint
```

Run linter and fix errors as possible:

```bash
npm run lint-fix
```

### Format

Check formatting with [prettier](https://prettier.io/):

```bash
npm run format-check
```

Run prettier and automatically format:

```bash
npm run format
```

### Package the extension

```bash
npm run package
```

### Run Web Extension

"Run Web Extension in VS Code" - run the [web version](https://code.visualstudio.com/api/extension-guides/web-extensions) of the extension

## VS Code Source Control Repositories

If you don't see `vscode-github-actions` and `languageservices`, please go to `Preferences: Open User Settings` and then search for   `git.openRepositoryInParentFolders` and you can set it to `always` and it will show all of the associated repos for the Workspace. 

![image](https://github.com/github/vscode-github-actions/assets/7976517/c03a1608-df4d-4caf-ba33-0c5eb1802100)

## Submitting a pull request

1. [Fork][fork] and clone the repository
1. Configure and install the dependencies (in the main root folder `~/vscode`): `npm i`
1. Create a new branch: `git checkout -b my-branch-name`
1. Make your change, add tests, and make sure the tests and linter still pass
1. Push to your fork and [submit a pull request][pr]

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Format your code with [prettier](https://prettier.io/).
- Write tests.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)

[bug issues]: https://github.com/github/vscode-github-actions/labels/bug
[feature request issues]: https://github.com/github/vscode-github-actions/labels/enhancement
[hw]: https://github.com/github/vscode-github-actions/labels/help%20wanted
[gfi]: https://github.com/github/vscode-github-actions/labels/good%20first%20issue
