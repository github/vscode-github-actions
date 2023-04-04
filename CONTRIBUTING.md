## Contributing

[fork]: https://github.com/github/vscode-github-actions/fork
[pr]: https://github.com/github/vscode-github-actions/compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

We accept pull requests for bug fixes and features where we've discussed the approach in an issue and given the go-ahead for a community member to work on it. We'd also love to hear about ideas for new features as issues.

Please do:

* Check existing issues to verify that the [bug][bug issues] or [feature request][feature request issues] has not already been submitted.
* Open an issue if things aren't working as expected.
* Open an issue to propose a significant change.
* Open a pull request to fix a bug.
* Open a pull request to fix documentation about a command.
* Open a pull request for any issue labelled [`help wanted`][hw] or [`good first issue`][gfi].

Please avoid:

* Opening pull requests for issues marked `needs-design`, `needs-investigation`, or `blocked`.

Contributions to this project are [released](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license) to the public under the [project's open source license](LICENSE.md).

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Prerequisites for running and testing code

These are one time installations required to be able to test your changes locally as part of the pull request (PR) submission process.

1. Install [Node.js](https://nodejs.org/en/download/) for your platform
1. Install [VS Code](https://code.visualstudio.com/download) for your platform
1. Install the dependencies. From the repository root run:
```bash
$ npm i
```

## Making & testing changes

The extension is written in TypeScript and built using [webpack](https://webpack.js.org/).

### Build

Build changes (one time):

```bash
$ npm run build
```

Or to watch for changes and automatically rebuild every time on save:

```bash
$ npm run watch
```

### Testing changes

1. Open the repository in VS Code
1. Run one of the debug targets:
  * "Watch & Launch extension" - watch extension files, compile as necessary, and run the extension using the _extension development host_
  * "Attach to Language-Server" - attach to an instance of the language server running on port `6010`
  * "Run Web Extension in VS Code" - run the [web version](https://code.visualstudio.com/api/extension-guides/web-extensions) of the extension

### Dev loop
1. Setup `Watch all & Launch Extension` under Debug and hit the green button
1. `npm run watch`
1. Make change
1. Hit the refresh button in the debugger window to reload the extension in the development host

### Running tests

```bash
$ npm test
```

Or to watch for changes and run tests:

```bash
$ npm run test-watch
```

### Lint

```bash
$ npm run lint
```

Run linter and fix errors as possible:

```bash
$ npm run lint-fix
```

### Format

Check formatting with [prettier](https://prettier.io/):

```bash
$ npm run format-check
```

Run prettier and automatically format:

```bash
$ npm run format
```

### Package the extension

```bash
$ npm run package
```

## Submitting a pull request

1. [Fork][fork] and clone the repository
1. Configure and install the dependencies: `npm i`
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
